import json
from pathlib import Path
import numpy as np
import tensorflow as tf
import tf2onnx
from tensorflow import keras
from warframe_marketplace_predictor.filepaths import (
    price_model_model_file_path,
    items_data_file_path,
    attributes_data_file_path,
    attribute_name_shortcuts_file_path,
)

model_path = Path(price_model_model_file_path)

# ── Load trained model ──────────────────────────────────────────────────────
original_model = keras.models.load_model(str(model_path))
print("Loaded trained model.")
print("Model layers:", [l.name for l in original_model.layers])

# ── Extract vocabularies from StringLookup layers ───────────────────────────
weapon_lookup = original_model.get_layer("weapon_url_name_lookup")
attr_lookup = original_model.get_layer("attributes_lookup")

weapon_vocab = weapon_lookup.get_vocabulary()
attr_vocab = attr_lookup.get_vocabulary()
print(f"Weapon vocab size: {len(weapon_vocab)}")
print(f"Attribute vocab size: {len(attr_vocab)}")

# Save vocabs as lists (index = vocab index)
vocab_dir = model_path.parent
with open(vocab_dir / "weapon_vocab.json", "w") as f:
    json.dump(list(weapon_vocab), f)
with open(vocab_dir / "attr_vocab.json", "w") as f:
    json.dump(list(attr_vocab), f)
print("Vocab JSONs saved.")

# ── Build integer-input-only model ──────────────────────────────────────────
# The original model has StringLookup layers that convert strings -> indices.
# We skip those and feed indices directly.

weapon_idx_input = keras.layers.Input(shape=(1,), dtype=tf.int32, name="weapon_idx")
re_rolled_input = keras.layers.Input(shape=(1,), dtype=tf.float32, name="re_rolled")
attr_indices_input = keras.layers.Input(shape=(4,), dtype=tf.int32, name="attr_indices")

# Copy weights from original embedding layers (they sit right after StringLookup)
weapon_emb = original_model.get_layer("weapon_url_name_embedding")(weapon_idx_input)
weapon_emb = keras.layers.Flatten(name="flatten_weapon")(weapon_emb)

attr_emb = original_model.get_layer("attributes_embedding")(attr_indices_input)
attr_emb = keras.layers.Flatten(name="flatten_attr")(attr_emb)

combined = keras.layers.Concatenate(name="combined_embedding")([weapon_emb, re_rolled_input, attr_emb])

x = original_model.get_layer("dense_2")(combined)
x = original_model.get_layer("dense_3")(x)
output = original_model.get_layer("output")(x)

export_model = keras.Model(
    inputs=[weapon_idx_input, re_rolled_input, attr_indices_input],
    outputs=output,
    name="riven_pricer",
)

# ── Verify with a test sample ───────────────────────────────────────────────
# Original model takes string inputs
test_orig_input = [
    np.array([["rubico"]], dtype=object),
    np.array([[1.0]], dtype=np.float32),
    np.array([["critical_chance", "multishot", "<NONE>", "<NONE>"]], dtype=object),
]
orig_pred = original_model.predict(test_orig_input, verbose=0)

# Export model takes integer indices
test_weapon = weapon_vocab.index("rubico") if "rubico" in weapon_vocab else 1
test_attr_cc = attr_vocab.index("critical_chance") if "critical_chance" in attr_vocab else 1
test_attr_ms = attr_vocab.index("multishot") if "multishot" in attr_vocab else 1
test_attr_none = 0  # mask token index

test_export_input = [
    np.array([[test_weapon]], dtype=np.int32),
    np.array([[1.0]], dtype=np.float32),
    np.array([[test_attr_cc, test_attr_ms, test_attr_none, test_attr_none]], dtype=np.int32),
]
export_pred = export_model.predict(test_export_input, verbose=0)
print(f"Original model prediction: {orig_pred[0][0]:.4f}")
print(f"Export model prediction:  {export_pred[0][0]:.4f}")
assert abs(orig_pred[0][0] - export_pred[0][0]) < 1e-4, "Predictions differ!"
print("Predictions match. V")

# ── Export to ONNX ──────────────────────────────────────────────────────────
input_spec = [
    tf.TensorSpec([None, 1], tf.int32, name="weapon_idx"),
    tf.TensorSpec([None, 1], tf.float32, name="re_rolled"),
    tf.TensorSpec([None, 4], tf.int32, name="attr_indices"),
]
model_proto, _ = tf2onnx.convert.from_keras(export_model, input_signature=input_spec, opset=17)
onnx_path = model_path.with_suffix(".onnx")
with open(onnx_path, "wb") as f:
    f.write(model_proto.SerializeToString())
print(f"ONNX model saved to: {onnx_path}")

# ── Build effect -> url_name map for Rust OCR integration ------------------
with open(attributes_data_file_path, "r", encoding="utf-8") as f:
    attrs_data = json.load(f)

effect_to_url = {}
for url_name, entry in attrs_data.items():
    effect = entry.get("effect", "").lower()
    if effect:
        effect_to_url[effect] = url_name

effect_map_path = model_path.parent / "effect_to_url_name.json"
with open(effect_map_path, "w", encoding="utf-8") as f:
    json.dump(effect_to_url, f, ensure_ascii=False, indent=2)
print(f"Effect->url_name map saved ({len(effect_to_url)} entries).")
