# Riven OCR Regression Corpus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a labeled, row-level regression corpus for Riven card OCR (Cycle + Confirm screens) so future OCR pipeline changes (row segmentation, grammar decoding, ensemble scoring — items 2-8 of Codex's plan in `TODO.md`) can be measured against real ground truth instead of judged by eyeballing a screenshot.

**Architecture:** A JSON manifest (`test-images/riven-corpus/manifest.json`) lists labeled samples. Each sample points at an existing screenshot fixture and records, per visible card, the expected row-level transcriptions (the exact text a perfect OCR would produce for each stat line). A new Rust test loads the manifest and asserts it's structurally valid (files exist, JSON parses, row counts are sane) — this is a scaffolding/guard test, not an accuracy test, since nothing reads rows independently yet (that's item 2). Existing `test-images/riven-cycle.png` and `riven-confirm.png` become the corpus's first two labeled samples.

**Tech Stack:** Rust (existing `src/bin/main.rs` test module), `serde_json` (already a dependency), existing PNG fixtures.

## Global Constraints

- Do not touch the current OCR pipeline (`src/ocr.rs`, `detect_riven_screen`, etc.) in this plan — this is corpus-building only, per Codex's priority order (item 1 before item 2).
- Reuse the existing `test-images/` fixture convention; don't invent a second fixture location.
- `cargo test --release --bin orbiter riven_` must still pass unchanged after this plan (no regressions to existing fixture tests).
- This plan produces no user-visible behavior change — it's test/data-only.

---

### Task 1: Corpus manifest schema + seeded entries

**Files:**
- Create: `test-images/riven-corpus/manifest.json`
- Create: `test-images/riven-corpus/README.md`
- Test: `src/bin/main.rs` (new `#[test]` in the existing `mod test` block, after `detects_riven_confirm_fixture`)

**Interfaces:**
- Produces: `test-images/riven-corpus/manifest.json`, an array of sample objects with this shape (documented in README.md too):
  ```json
  {
    "image": "riven-cycle.png",
    "mode": "Cycle",
    "cards": [
      {
        "rows": [
          {"raw_text": "+52.3% Electricity", "numeric_token": "+52.3%", "stat_name": "Electricity"},
          {"raw_text": "+49.1% Status Chance", "numeric_token": "+49.1%", "stat_name": "Status Chance"}
        ]
      }
    ],
    "variant": "Tenet Arca Plasmor"
  }
  ```
  `image` is a filename relative to `test-images/riven-corpus/`. Later plans (item 2+) will read this manifest to drive per-row accuracy tests; this task only defines and validates the shape.

- [ ] **Step 1: Create the corpus directory and copy in the two existing fixtures**

```bash
mkdir -p /var/home/jedwards/wfinfo-ng/test-images/riven-corpus
cp /var/home/jedwards/wfinfo-ng/test-images/riven-cycle.png /var/home/jedwards/wfinfo-ng/test-images/riven-corpus/riven-cycle.png
cp /var/home/jedwards/wfinfo-ng/test-images/riven-confirm.png /var/home/jedwards/wfinfo-ng/test-images/riven-corpus/riven-confirm.png
```

- [ ] **Step 2: Write `test-images/riven-corpus/README.md`**

```markdown
# Riven OCR Regression Corpus

Labeled ground truth for Riven Cycle/Confirm screen OCR, used to measure
row-level recognition accuracy as the OCR pipeline changes (see the
"OCR research conclusion" section of `TODO.md`).

## Adding a sample

1. Drop the screenshot PNG in this directory.
2. Add an entry to `manifest.json`:
   - `image`: filename in this directory.
   - `mode`: `"Cycle"` (one visible card) or `"Confirm"` (two visible cards,
     old left / new right).
   - `cards`: one entry per visible card, in left-to-right order. Each card
     has a `rows` array — one entry per visible stat line, top to bottom.
     - `raw_text`: the exact text a human reads off that row (numeric token
       + stat name together, as it visually appears).
     - `numeric_token`: just the sign/multiplier + digits + `%`/decimal
       portion (e.g. `+52.3%`, `x0.88`, `-62%`).
     - `stat_name`: just the stat name portion (e.g. `Electricity`,
       `Weapon Recoil`, `Critical Damage`).
   - `variant`: the weapon name shown in the "FITS IN" line.
3. Prefer real captures over synthetic ones — failed/misread live captures
   (see `DATA_DIR/failed-captures/`) are exactly what this corpus should
   grow to include, labeled with what the row *should* have read.

Good candidates to add next: any future live misread (like the confirmed
"+44% Critical Damage" -> "+44% Critical I 1Damage" case), different
resolutions/UI scales, both cards in comparison mode, animation-blurred
frames, elemental icons embedded in stat names, wrapped generated names.
```

- [ ] **Step 3: Write `test-images/riven-corpus/manifest.json`**

Label the two existing fixtures based on what the current fixture tests
already assert about them (`detects_riven_cycle_fixture` /
`detects_riven_confirm_fixture` in `src/bin/main.rs`): both show a
"Tenet Arca Plasmor", Cycle has one card, Confirm has two, and both cards'
text contains "Arca Plasmor". Since the exact per-row stat text for these
two specific screenshots isn't recorded anywhere yet, this task labels only
what's independently verifiable right now (`mode`, `variant`, card count)
and leaves `cards[].rows` as an empty array with a `"TODO_LABEL"` marker
`note` field — Task 2 is specifically about filling that in by hand while
looking at the actual screenshots.

```json
[
  {
    "image": "riven-cycle.png",
    "mode": "Cycle",
    "variant": "Tenet Arca Plasmor",
    "cards": [
      { "note": "TODO_LABEL", "rows": [] }
    ]
  },
  {
    "image": "riven-confirm.png",
    "mode": "Confirm",
    "variant": "Tenet Arca Plasmor",
    "cards": [
      { "note": "TODO_LABEL", "rows": [] },
      { "note": "TODO_LABEL", "rows": [] }
    ]
  }
]
```

- [ ] **Step 4: Add `serde` derive types and a loader-validation test in `src/bin/main.rs`**

Add near the top of the `#[cfg(test)] mod test` block (after the existing
`use` lines, before `detects_riven_cycle_fixture`):

```rust
    #[derive(serde::Deserialize)]
    struct CorpusRow {
        #[allow(dead_code)]
        raw_text: String,
        #[allow(dead_code)]
        numeric_token: String,
        #[allow(dead_code)]
        stat_name: String,
    }

    #[derive(serde::Deserialize)]
    struct CorpusCard {
        #[serde(default)]
        note: Option<String>,
        rows: Vec<CorpusRow>,
    }

    #[derive(serde::Deserialize)]
    struct CorpusSample {
        image: String,
        mode: String,
        variant: String,
        cards: Vec<CorpusCard>,
    }

    #[test]
    fn riven_corpus_manifest_is_well_formed() {
        let manifest_path = "test-images/riven-corpus/manifest.json";
        let raw = read_to_string(manifest_path)
            .unwrap_or_else(|e| panic!("failed to read {manifest_path}: {e}"));
        let samples: Vec<CorpusSample> = serde_json::from_str(&raw)
            .unwrap_or_else(|e| panic!("failed to parse {manifest_path}: {e}"));

        assert!(!samples.is_empty(), "corpus manifest has no samples");

        for sample in &samples {
            let image_path = format!("test-images/riven-corpus/{}", sample.image);
            assert!(
                std::path::Path::new(&image_path).exists(),
                "manifest references missing image: {image_path}"
            );
            assert!(
                sample.mode == "Cycle" || sample.mode == "Confirm",
                "sample {} has unknown mode {:?}",
                sample.image,
                sample.mode
            );
            let expected_cards = if sample.mode == "Cycle" { 1 } else { 2 };
            assert_eq!(
                sample.cards.len(),
                expected_cards,
                "sample {} has {} cards, expected {} for mode {}",
                sample.image,
                sample.cards.len(),
                expected_cards,
                sample.mode
            );
            assert!(!sample.variant.is_empty(), "sample {} has empty variant", sample.image);
            for (i, card) in sample.cards.iter().enumerate() {
                if card.rows.is_empty() {
                    assert_eq!(
                        card.note.as_deref(),
                        Some("TODO_LABEL"),
                        "sample {} card {} has no rows and no TODO_LABEL note",
                        sample.image,
                        i
                    );
                }
            }
        }
    }
```

This is deliberately a *structure* check, not an accuracy check — it just
guarantees the corpus stays parseable and internally consistent (right file
exists, right card count per mode, unlabeled cards are explicitly marked
rather than silently empty) as people add samples over time. Row-level
accuracy assertions come in item 2's plan, once row segmentation exists to
test against.

- [ ] **Step 5: Confirm `serde_json` is already a dependency**

```bash
grep -n "^serde" /var/home/jedwards/wfinfo-ng/Cargo.toml
```

Expected: both `serde` and `serde_json` already listed (used elsewhere for
`latest-detection.json`/`riven-screen.json`). If either is missing, add it
via `cargo add serde --features derive` / `cargo add serde_json` before
continuing.

- [ ] **Step 6: Run the new test**

```bash
cd /var/home/jedwards/wfinfo-ng && cargo test --release --bin orbiter riven_corpus_manifest_is_well_formed -- --nocapture
```

Expected: `1 passed`.

- [ ] **Step 7: Run the full existing Riven test suite to confirm no regressions**

```bash
cd /var/home/jedwards/wfinfo-ng && cargo test --release --bin orbiter riven_ -- --nocapture
```

Expected: all previously-passing Riven tests (fixture detection, consensus,
scrub) still pass, plus the new manifest test.

- [ ] **Step 8: Commit**

```bash
git add test-images/riven-corpus/ src/bin/main.rs
git commit -m "Add labeled Riven OCR regression corpus scaffold with structural validation test"
```

---

### Task 2: Hand-label the two seeded samples' rows

**Files:**
- Modify: `test-images/riven-corpus/manifest.json`

**Interfaces:**
- Consumes: `test-images/riven-corpus/riven-cycle.png`, `riven-confirm.png` (visually inspected), the `CorpusSample`/`CorpusCard`/`CorpusRow` schema from Task 1.
- Produces: manifest entries with real `rows` data and `note` removed, ready for item 2's row-segmentation work to test against.

- [ ] **Step 1: View both fixture screenshots and transcribe each visible stat row**

```bash
# open these for viewing (adjust to whatever image viewer is available)
xdg-open /var/home/jedwards/wfinfo-ng/test-images/riven-corpus/riven-cycle.png
xdg-open /var/home/jedwards/wfinfo-ng/test-images/riven-corpus/riven-confirm.png
```

This step needs a human (Jacob) to read the actual on-screen text, since
it's the ground-truth label the whole corpus depends on — an OCR engine
transcribing its own ground truth would defeat the purpose.

- [ ] **Step 2: Fill in each card's `rows` array and remove its `note` field**

Edit `test-images/riven-corpus/manifest.json`, replacing each
`{"note": "TODO_LABEL", "rows": []}` with the real transcribed rows, e.g.:

```json
{
  "rows": [
    {"raw_text": "+52.3% Electricity", "numeric_token": "+52.3%", "stat_name": "Electricity"},
    {"raw_text": "+49.1% Status Chance", "numeric_token": "+49.1%", "stat_name": "Status Chance"}
  ]
}
```

- [ ] **Step 3: Re-run the manifest validation test**

```bash
cd /var/home/jedwards/wfinfo-ng && cargo test --release --bin orbiter riven_corpus_manifest_is_well_formed -- --nocapture
```

Expected: `1 passed` (the `TODO_LABEL` assertion no longer applies since
`rows` is non-empty).

- [ ] **Step 4: Commit**

```bash
git add test-images/riven-corpus/manifest.json
git commit -m "Label row-level ground truth for the two seeded Riven corpus fixtures"
```

---

## Self-Review Notes

- **Spec coverage**: this plan covers only Codex item 1 ("Create the labeled row-level regression corpus"). Items 2-8 are intentionally out of scope — each will get its own plan once the prior item's output (e.g. row segmentation's actual data shape) is known.
- **No placeholders**: the one intentional "TODO_LABEL" is a literal data marker the schema and test understand, not an unfinished plan step — Task 2 exists specifically to resolve it.
- **Type consistency**: `CorpusSample`/`CorpusCard`/`CorpusRow` field names in Task 1 match the JSON keys used in both the manifest and the README's documented schema.
