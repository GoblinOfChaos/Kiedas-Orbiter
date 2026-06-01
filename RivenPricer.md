# WarframeRivenPricer — Full Codebase Analysis
## For ONNX Export + Rust (`ort`) Port into Cephalon Kronos

## Architecture summary

The model is **much simpler than it looks from the outside.** Only 3 inputs matter at inference time:

1. **`weapon_url_name`** (string → embedding) — e.g. `"rubico"`
2. **`re_rolled`** (float, 0.0 or 1.0) — has the riven been rolled at least once
3. **`[positive1, positive2, positive3, negative]`** (4 strings → shared embedding) — stat url_names like `"critical_chance"`, or `"<NONE>"` for empty slots

That's it. **Numeric roll values (the 161.7% etc.) are not fed to the model at all.** The model learns from what stats a riven has, not how well it rolled. This is a deliberate design decision cjtho made after testing — he found it didn't significantly help.

The output is `log1p(platinum)` — you **must** apply `expm1()` to get actual platinum.

---

## The three phases mapped out

**Phase 1 (re-scrape):** Just run `download_data.py`. It hits `api.warframe.market` and `api.warframestat.us`. All new Incarnon, Tenet, and Prime weapons will be captured automatically since the weapon list is pulled live. The scraper handles rate limiting with exponential backoff.

**Phase 2 (ONNX export):** The tricky part is that the Keras model has `StringLookup` layers baked in, which ONNX doesn't speak natively. The solution (detailed in the doc) is to extract the vocabularies first, build a new Keras model that takes integer indices instead of strings, copy the weights, then export *that* with `tf2onnx`. You'll ship `weapon_vocab.json` and `attr_vocab.json` alongside the `.onnx`.

**Phase 3 (Rust):** Your Rust module needs to do: OCR display name → `effect` field lookup → `url_name` → vocab index. The `attribute_name_shortcuts.json` gives you shorthand→url_name, and `attributes_data.json` gives you `effect` (display name) → `url_name`. Three HashMaps at startup, then it's pure index lookups → `ort` session → `expm1()`.

One thing worth flagging for the OCR integration: your OCR gives display names like "Critical Chance" — you'll need a `display_name.to_lowercase() → url_name` map built from `attributes_data.json`'s `effect` field, since that's what the stat card text matches.



---

## 1. Repository Map

```
WarframeRivenPricer/
├── filepaths.py                            # Central path registry (all file locations)
├── tool_setup_and_maintenance/
│   ├── auto_setup.py                       # Orchestrator: runs all setup steps
│   ├── download_data.py                    # ★ DATA SCRAPER — hits warframe.market + warframestat.us
│   ├── create_marketplace_dataframe.py     # ★ FEATURE ENGINEERING — raw JSON → training CSV
│   └── setup_weapon_information.py         # Post-training: runs inference on all weapons, builds ranking/distribution JSON
├── training/
│   ├── preprocessors/
│   │   └── price_model_preprocessor.py     # ★ PREPROCESSOR + MODEL ARCHITECTURE (Keras functional API)
│   └── trainers/
│       └── train_price_model.py            # ★ TRAINING LOOP + evaluation
├── riven_tool/
│   └── rivens_analysis.py                  # CLI entry point: takes riven dicts, prints price table
└── shtuff/
    ├── data_handler.py                     # ★ ALL LOOKUP LOGIC — weapon names, attribute shortcuts, disposition, etc.
    ├── make_prediction.py                  # ★ INFERENCE ENGINE — PricePredictor class
    ├── riven_funcs.py                      # Analysis layer: reroll math, permutation generation, table display
    ├── storage_handling.py                 # read_json / save_json helpers
    ├── WIP_bias_adjustor.py                # Unfinished: shifts listing prices toward traded prices
    └── WIP_liquidity_gradient.py           # Unfinished: liquidity model experiments
```

---

## 2. Phase 1 — Data Scraping & Re-Running for Modern Meta

### 2a. What `download_data.py` hits

| Data File | Source API | What it contains |
|---|---|---|
| `items_data.json` | `https://api.warframe.market/v1/riven/items` | All riveable weapons: `item_name`, `url_name`, `group` |
| `attributes_data.json` | `https://api.warframe.market/v1/riven/attributes` | All riven stat types: `url_name`, `effect`, `units`, `positive` |
| `raw_marketplace_data.json` | `https://api.warframe.market/v1/auctions/search?type=riven&weapon_url_name=X&sort_by=price_asc/price_desc` | ~200K auction listings, 2 price orderings × every weapon |
| `developer_summary_stats.json` | `https://api.warframestat.us/pc/rivens` | DE's own traded riven stats: avg, stddev, pop, min/max per weapon |
| `ig_weapon_stats.json` | `https://api.warframestat.us/weapons` | Base weapon stats: disposition, mastery, etc. |

**To re-run for current meta:** just run `download_data.py` with `overwrite=True`. The scraper is rate-limit-aware (exponential backoff on 429). It fetches both `price_asc` and `price_desc` sorts per weapon and deduplicates by auction ID. All Incarnon and new Prime weapons will be picked up automatically since the weapon list comes from the live API.

### 2b. What `create_marketplace_dataframe.py` does (Feature Engineering)

The raw JSON is transformed into a flat CSV. Each row is one auction listing. The pipeline runs in order:

1. **`create_df()`** — Flattens each listing into columns:
   - `weapon_url_name`, `polarity`, `mod_rank`, `re_rolls`, `re_rolled` (bool), `master_level`
   - `positive1`, `positive2`, `positive3`, `negative` — the **stat url_names** (e.g. `critical_chance`)
   - `positive1_value`, `positive2_value`, `positive3_value`, `negative_value` — the **numeric roll values** (e.g. `97.3`)
   - `starting_price`, `buyout_price`, `is_direct_sell`

2. **`handle_prices()`** — Filters and consolidates:
   - Drops rows with no `buyout_price`, price < 10 or > 10,000 platinum
   - Keeps only `is_direct_sell == True` (fixed price listings, not auctions)
   - Creates `listing_price = buyout_price`

3. **`remove_duplicate_rows()`** — Deduplicates on all attribute columns.

4. **`minor_final_adjustments()`** — Shuffles with seed 42.

> **Important:** Several pipeline steps are currently **disabled** (`"run": False`):
> - `add_supplementary_weapon_information()` — would add `group`, `disposition`, `has_incarnon`, `avg_trade_price` columns
> - `add_permutation_data()` — would synthetically expand the dataset by permuting attribute order
>
> These are commented out in the active model, meaning **numeric riven values, disposition, and incarnon status are NOT used by the current model**. Only stat names (as strings) matter.

---

## 3. Phase 2 — Model Architecture & ONNX Export

### 3a. The Keras Model (from `price_model_preprocessor.py`)

The model is defined as a Keras functional API model named `riven_model`. Here is the exact data flow:

```
Inputs:
  weapon_url_name_input  shape=(1,)   dtype=string  → "vasto_prime"
  re_rolled_input        shape=(1,)   dtype=float32 → 1.0
  attributes_input       shape=(4,)   dtype=string  → ["critical_chance", "multishot", "<NONE>", "<NONE>"]
                                                         ↑pos1               ↑pos2         ↑pos3      ↑neg

Processing:
  weapon_url_name_input
    → StringLookup(vocab=all_weapon_url_names, mask_token="<NONE>")  → int index
    → Embedding(input_dim=len(weapons)+1, output_dim=32)             → [1, 1, 32]
    → Flatten()                                                       → [1, 32]

  attributes_input
    → StringLookup(vocab=all_attribute_url_names, mask_token="<NONE>") → [1, 4] int indices
    → Embedding(input_dim=len(attributes)+1, output_dim=32)            → [1, 4, 32]
    → Flatten()                                                         → [1, 128]

  Concatenate([weapon_embedding_32, re_rolled_1, attributes_embedding_128]) → [1, 161]

  Dense(128, activation="relu")
  Dense(32, activation="relu")
  Dense(1, activation="linear")   → log1p(platinum_price)

Output: expm1(output) = platinum_price estimate
```

**Loss function:** `logcosh`
**Optimizer:** `adam`
**Target:** `np.log1p(listing_price)` — must apply `np.expm1()` to the raw model output.

### 3b. The Preprocessor (`price_preprocessor.pkl`)

The `Preprocessor` class is almost trivially simple in its current active form:
```python
def transform(self, X: pd.DataFrame) -> List[pd.DataFrame]:
    X_copy = X.copy()
    X_copy["re_rolled"] = X_copy["re_rolled"].astype(np.float32)
    X_copy = X_copy.fillna("<NONE>")  # fills missing pos3/neg with the mask token
    return [
        X_copy[["weapon_url_name"]],        # → weapon_url_name_input
        X_copy[["re_rolled"]],              # → re_rolled_input
        X_copy[["positive1", "positive2", "positive3", "negative"]]  # → attributes_input
    ]
```

The pickle is essentially stateless. The real vocabulary lives **inside the saved Keras model** as `StringLookup` layer weights.

### 3c. The KMeans file (`price_kmeans.pkl`)

The `price_kmeans.pkl` is referenced in `filepaths.py` but **not used in the active inference pipeline**. It is used in `setup_weapon_information.py` to cluster weapon price distributions into tiers for the reroll EV calculation. It does **not** need to be ported to Rust for price prediction.

### 3d. ONNX Export Strategy

The Keras model uses TF `StringLookup` layers, which **cannot be trivially exported to ONNX** as-is (the string operations are not ONNX-native). The correct strategy is:

**Split the pipeline at the embedding boundary:**

```
Python (one-time, at export time):
  Extract vocabulary lists from the trained model:
    weapon_vocab = model.get_layer("weapon_url_name_lookup").get_vocabulary()
    attr_vocab   = model.get_layer("attributes_lookup").get_vocabulary()
  Save as weapon_vocab.json and attr_vocab.json

  Build a new "numeric-input-only" Keras model that takes integer indices:
    weapon_idx_input   shape=(1,)  dtype=int32
    re_rolled_input    shape=(1,)  dtype=float32
    attr_indices_input shape=(4,)  dtype=int32
  
  Copy weights from original embedding/dense layers into new model.
  Export new model to ONNX with tf2onnx.

Rust (runtime):
  Load weapon_vocab.json and attr_vocab.json as HashMap<String, i32>
  Map: weapon_url_name → integer index
  Map: each of [positive1, positive2, positive3, negative] → integer index
  Feed integer tensors + re_rolled float to ONNX via `ort`
  Apply expm1() to raw output → platinum estimate
```

**Export script outline:**
```python
import tensorflow as tf
import tf2onnx
import numpy as np
import json

# Load original model
original_model = tf.keras.models.load_model("price_model.h5")

# Extract vocabularies
weapon_vocab = original_model.get_layer("weapon_url_name_lookup").get_vocabulary()
attr_vocab   = original_model.get_layer("attributes_lookup").get_vocabulary()
json.dump(list(weapon_vocab), open("weapon_vocab.json", "w"))
json.dump(list(attr_vocab),   open("attr_vocab.json", "w"))

# Build integer-input-only model
weapon_idx_input   = tf.keras.layers.Input(shape=(1,),  dtype=tf.int32, name="weapon_idx")
re_rolled_input    = tf.keras.layers.Input(shape=(1,),  dtype=tf.float32, name="re_rolled")
attr_indices_input = tf.keras.layers.Input(shape=(4,),  dtype=tf.int32, name="attr_indices")

# Re-wire layers (skip StringLookup, reuse Embedding + Dense weights)
weapon_emb = original_model.get_layer("weapon_url_name_embedding")(weapon_idx_input)
weapon_emb = tf.keras.layers.Flatten()(weapon_emb)

attr_emb   = original_model.get_layer("attributes_embedding")(attr_indices_input)
attr_emb   = tf.keras.layers.Flatten()(attr_emb)

combined   = tf.keras.layers.Concatenate()([weapon_emb, re_rolled_input, attr_emb])
x          = original_model.get_layer("dense")(combined)       # Dense 128
x          = original_model.get_layer("dense_1")(x)            # Dense 32
output     = original_model.get_layer("output")(x)             # Dense 1

export_model = tf.keras.Model(
    inputs=[weapon_idx_input, re_rolled_input, attr_indices_input],
    outputs=output
)

# Export to ONNX
input_sig = [
    tf.TensorSpec([None, 1], tf.int32,   name="weapon_idx"),
    tf.TensorSpec([None, 1], tf.float32, name="re_rolled"),
    tf.TensorSpec([None, 4], tf.int32,   name="attr_indices"),
]
model_proto, _ = tf2onnx.convert.from_keras(export_model, input_signature=input_sig, opset=17)
with open("riven_pricer.onnx", "wb") as f:
    f.write(model_proto.SerializeToString())
print("ONNX model saved.")
```

---

## 4. Phase 3 — Rust Preprocessing Module for `ort`

### 4a. What the Rust module needs to do

Given OCR-parsed riven text from Cephalon Kronos, the Rust module must reproduce the Python `PricePredictor.prepare()` → `Preprocessor.transform()` pipeline:

```
OCR text output  →  parse into structured fields  →  lookup table maps  →  integer tensors  →  ort InferenceSession  →  expm1(output)
```

### 4b. Data files needed at runtime in Tauri (ship these as app assets)

| File | Source | Used for |
|---|---|---|
| `riven_pricer.onnx` | Generated by export script | The model itself |
| `weapon_vocab.json` | Extracted from trained model | `weapon_url_name → int32 index` |
| `attr_vocab.json` | Extracted from trained model | `attribute_url_name → int32 index` |
| `attribute_name_shortcuts.json` | `data_files/` from original repo | `shorthand → url_name` (e.g. `"cc" → "critical_chance"`) |
| `items_data.json` | Downloaded by `download_data.py` | `item_name → url_name` (e.g. `"Vasto Prime" → "vasto_prime"`) |

### 4c. The Rust preprocessing steps

```rust
// Pseudo-Rust — exact API depends on your ort version and tensor handling

use std::collections::HashMap;

struct RivenPreprocessor {
    // Maps weapon item_name or url_name → url_name
    weapon_name_to_url: HashMap<String, String>,
    // Maps url_name → vocab index (from weapon_vocab.json)
    weapon_vocab: HashMap<String, i32>,
    // Maps attribute shorthand → url_name (from attribute_name_shortcuts.json)
    attr_shortcuts: HashMap<String, String>,
    // Maps attribute url_name → vocab index (from attr_vocab.json)
    attr_vocab: HashMap<String, i32>,
    
    mask_token: String,  // "<NONE>"
    mask_index: i32,     // index of "<NONE>" in vocab (usually 0 or 1)
}

impl RivenPreprocessor {
    fn preprocess(&self, riven: &RivenInput) -> ModelInputs {
        // 1. Normalize weapon name to url_name
        let url_name = self.weapon_name_to_url
            .get(&riven.weapon_name)
            .expect("Unknown weapon");
        
        // 2. Look up weapon vocab index
        let weapon_idx = *self.weapon_vocab
            .get(url_name.as_str())
            .unwrap_or(&self.mask_index);
        
        // 3. Normalize attribute shorthands to url_names, then to indices
        //    OCR output might be shorthands ("cc", "cd") or already url_names
        let mut attr_indices = [self.mask_index; 4]; // [pos1, pos2, pos3, neg]
        let attr_slots = [
            riven.positive1.as_deref(),
            riven.positive2.as_deref(),
            riven.positive3.as_deref(),
            riven.negative.as_deref(),
        ];
        for (i, attr_opt) in attr_slots.iter().enumerate() {
            if let Some(attr) = attr_opt {
                // Resolve shorthand → url_name (shortcuts map includes identity entries)
                let url = self.attr_shortcuts.get(*attr)
                    .map(|s| s.as_str())
                    .unwrap_or(attr);
                attr_indices[i] = *self.attr_vocab
                    .get(url)
                    .unwrap_or(&self.mask_index);
            }
        }
        
        // 4. re_rolled flag
        let re_rolled: f32 = if riven.re_rolls > 0 { 1.0 } else { 0.0 };
        
        ModelInputs {
            weapon_idx: weapon_idx,    // i32, shape [1, 1]
            re_rolled: re_rolled,      // f32, shape [1, 1]
            attr_indices: attr_indices, // [i32; 4], shape [1, 4]
        }
    }
}

// After ort inference, undo the log1p transform:
fn postprocess(raw_output: f32) -> f32 {
    raw_output.exp() - 1.0  // equivalent to np.expm1()
}
```

### 4d. Attribute shortcut resolution detail

The `attribute_name_shortcuts.json` contains entries like:
```json
{
  "cc":  "critical_chance",
  "cd":  "critical_damage",
  "ms":  "multishot",
  "dmg": "base_damage_/_melee_damage",
  "sc":  "status_chance",
  ...
}
```

Importantly, in `data_handler.py`, the shortcuts dict is extended with **identity entries** before validation:
```python
self.attribute_name_shortcuts.update({v: v for v in self.attribute_name_shortcuts.values()})
```

This means url_names also pass the `is_valid_attribute_shortcut()` check. Your Rust map should do the same: if a lookup misses, fall back to treating the input as already a url_name.

### 4e. Vocab index boundary condition

The `StringLookup` layer uses `mask_token="<NONE>"`. In Keras, the mask token gets index **0**. Unknown tokens get index **1**. The vocab list from `get_vocabulary()` will have `""` at index 0 (the mask) and `"[UNK]"` at index 1. When building your Rust HashMap, map `"<NONE>"` explicitly to index 0.

---

## 5. Full End-to-End Data & Inference Flow (for Rust port)

```
Cephalon Kronos PP-OCRv5 output:
  "Rubico Riven Mod  •  Critatis  +161.7% Critical Chance  +92.4% Multishot  -59.3% Zoom"

                            ↓ (your existing OCR parsing layer)

Structured RivenInput {
    weapon_name: "Rubico",
    positives: ["Critical Chance", "Multishot"],  // or shorthands
    negative: Some("Zoom"),
    re_rolls: 3,
}

                            ↓ (Rust RivenPreprocessor)

1. "Rubico" → items_data.json → url_name = "rubico"
2. "rubico" → weapon_vocab.json → weapon_idx = 247  (example)
3. "Critical Chance" → attr_shortcuts → "critical_chance" → attr_vocab → idx = 12
4. "Multishot"       → attr_shortcuts → "multishot"       → attr_vocab → idx = 31
5. no positive3      → mask_index = 0
6. "Zoom"            → attr_shortcuts → "zoom"            → attr_vocab → idx = 58
7. re_rolls=3 → re_rolled = 1.0

ort input tensors:
  weapon_idx   : [[247]]     int32   shape [1,1]
  re_rolled    : [[1.0]]     float32 shape [1,1]
  attr_indices : [[12,31,0,58]] int32 shape [1,4]

                            ↓ ort InferenceSession.run()

raw output: [[5.842]]  (log1p scale)

                            ↓ expm1()

predicted platinum: 343  platinum  ✓
```

---

## 6. Key Gaps & What You Need to Build

### Things the original model does NOT use (but could improve accuracy if added later):
- Actual numeric riven roll values (e.g. 161.7% crit chance) — the model only sees that *critical_chance* is a stat, not how high it rolled
- Disposition score
- Incarnon status
- Weapon group (primary/secondary/melee)

### Things you need to implement fresh:
1. **OCR → structured attribute shorthand mapping**: Your OCR gives stat display names ("Critical Chance"). You need a `display_name → url_name` map. This is available from `attributes_data.json` (the `effect` field maps to the display name). Build a lookup: `effect.lowercase() → url_name`.

2. **ONNX export script**: Run once in Python after re-training. Use `tf2onnx` v1.16+.

3. **Rust vocab loader**: Load `weapon_vocab.json` and `attr_vocab.json` at startup as `HashMap<String, i32>`.

4. **Rust `ort` session**: Use `ort` crate (onnxruntime wrapper). Create session from `.onnx` file, run with 3 named inputs.

5. **The `setup_weapon_information.py` pass**: After training, this script runs the model over every possible riven combination per weapon to build `weapon_ranking_information.json` and `global_price_freq.json`. These drive the reroll EV math. You'd need to either keep that Python step in your build pipeline, or re-implement the reroll EV math in Rust separately.

---

## 7. Recommended Re-Training Steps (for modern meta)

```bash
# Step 1: Re-scrape everything fresh
cd warframe_marketplace_predictor
python tool_setup_and_maintenance/download_data.py

# Step 2: Rebuild training dataframe
python tool_setup_and_maintenance/create_marketplace_dataframe.py

# Step 3: Retrain the model
python training/trainers/train_price_model.py

# Step 4: Rebuild weapon ranking info (for reroll EV)
python tool_setup_and_maintenance/setup_weapon_information.py

# Step 5: Export to ONNX (new script you'll write per section 3d above)
python export_to_onnx.py
```

The scraper will automatically pick up Incarnon weapons, new Primes, and Tenet/Kuva weapons since they come from the live warframe.market item list. Disposition changes will flow through `ig_weapon_stats.json` from warframestat.us.