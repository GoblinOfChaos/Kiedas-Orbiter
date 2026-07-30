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
