# Riven OCR Row Segmentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement item 2 of the OCR research plan in `TODO.md` ("Segment first, recognize second") — detect text rows on a Riven card crop, then run recognition-only on each isolated row image, instead of trusting the combined detect+recognize pipeline's per-box text on a multi-line crop. This is purely additive: it does not touch `detect_riven_screen()` or anything Python-side consumes today.

**Architecture:** `ocr-rs`'s `OcrEngine` (already used via `image_to_string()` in `src/ocr.rs`) exposes `detect()` (detection only, returns `Vec<TextBox>` with `rect`/`score`) and `recognize_text()` (recognition only, takes a pre-cropped image, returns `RecognitionResult { text, confidence, char_scores }`) as separate public methods — confirmed by reading `ocr-rs` 2.3.4's `src/engine.rs` directly, not assumed from docs. A new `image_to_rows()` function in `src/ocr.rs` calls `detect()` on the (already-enlarged) card crop to find row boxes, crops each box out individually with a small padding margin, and calls `recognize_text()` on each isolated crop — instead of `image_to_string()`'s current approach of calling the combined `recognize()` once on the whole multi-line crop and trusting its per-box text. This new function returns structured `OcrRow { text, confidence, rect }` — preserving the confidence and geometry that `image_to_string()` currently discards (Codex's confirmed finding: `src/ocr.rs:514` destructures `OcrResult_` down to `(top, left, text)`, dropping `confidence`).

**Tech Stack:** Rust, `ocr-rs` 2.3.4 (`OcrEngine::detect`, `OcrEngine::recognize_text`, `imageproc::rect::Rect`), existing `test-images/riven-corpus/manifest.json` (from the prior corpus plan) as the accuracy comparison target.

## Global Constraints

- Do not modify `detect_riven_screen()`, `riven_ocr_region()`, or any function Python code reads output from (`riven-screen.json`, `latest-detection.json` shapes) — this plan adds a new, unused-by-production-code-yet function so it can be measured safely before anything switches over to it.
- Do not modify `image_to_string()` itself — it stays as the reward-detection path's implementation, untouched.
- `cargo test --release --bin orbiter riven_` must still pass unchanged after this plan.
- New code goes in `src/ocr.rs` (the row segmentation primitive) and a new test in `src/bin/main.rs`'s existing `mod test` block (the corpus-driven accuracy check) — matching where equivalent code already lives (`image_to_string()` is in `ocr.rs`; Riven-specific test fixtures are in `main.rs`).
- Do not make any change not explicitly specified by this plan's steps. If a step fails, doesn't match the current codebase (wrong line numbers, missing symbol, unexpected pre-existing changes in a file this plan touches, etc.), or produces an unexpected error, stop and report it back instead of improvising a fix or working around it.

---

### Task 1: `OcrRow` struct + `image_to_rows()` in `src/ocr.rs`

**Files:**
- Modify: `src/ocr.rs` (add after `image_to_string()`, i.e. after line ~562, before `reward_image_to_reward_names()`)

**Interfaces:**
- Produces:
  ```rust
  pub struct OcrRow {
      pub text: String,
      pub confidence: f32,
      pub rect: (u32, u32, u32, u32), // (x, y, width, height), in the *input* image's pixel space
  }

  pub fn image_to_rows(
      ocr: &mut Option<OcrEngine>,
      image: &DynamicImage,
  ) -> Result<Vec<OcrRow>, anyhow::Error>
  ```
  Rows are returned in reading order (top-to-bottom, using the same row-grouping-then-left-to-right logic `image_to_string()` already uses, since multi-word single lines still need grouping even at the row-detection stage).

- [x] **Step 1: Add the `OcrRow` struct and `image_to_rows()` function**

```rust
/// One OCR-detected text row: its recognized text, the recognizer's own
/// confidence for that text, and its bounding rect in the *input* image's
/// pixel coordinates (i.e. relative to whatever crop was passed in, not
/// the full screenshot).
pub struct OcrRow {
    pub text: String,
    pub confidence: f32,
    pub rect: (u32, u32, u32, u32),
}

/// Segment-first, recognize-second: detect text row boundaries on the
/// whole image, then run recognition-only on each isolated row crop
/// rather than trusting the combined detect+recognize pipeline's
/// per-box text on a multi-line image. Unlike image_to_string(), this
/// preserves per-row confidence and geometry instead of flattening
/// everything into one joined string.
pub fn image_to_rows(
    ocr: &mut Option<OcrEngine>,
    image: &DynamicImage,
) -> Result<Vec<OcrRow>, anyhow::Error> {
    if ocr.is_none() {
        *ocr = Some(load_ocr_engine()?);
    }
    let engine = ocr
        .as_ref()
        .ok_or_else(|| anyhow::anyhow!("OCR engine was unavailable after initialization"))?;

    let (w, h) = (image.width(), image.height());
    if w == 0 || h == 0 {
        anyhow::bail!("OCR image has zero width or height");
    }
    // Same modest upscale image_to_string() uses - detection is more
    // reliable on enlarged small UI text.
    let enlarged = image.resize(
        w.saturating_mul(2),
        h.saturating_mul(2),
        image::imageops::FilterType::Lanczos3,
    );

    let boxes = engine
        .detect(&enlarged)
        .map_err(|e| anyhow::anyhow!("OCR detection failed: {e}"))?;

    // Group boxes into rows the same way image_to_string() does (close
    // top values, then left-to-right), so a single visual line split
    // across multiple word-level detections still becomes one row
    // before cropping/recognizing.
    let mut boxes: Vec<_> = boxes
        .into_iter()
        .map(|b| (b.rect.top(), b.rect.left(), b))
        .collect();
    boxes.sort_by(|a, b| a.0.cmp(&b.0).then(a.1.cmp(&b.1)));

    const ROW_MERGE_THRESHOLD_PX: i32 = 12;
    let mut rows: Vec<Vec<imageproc::rect::Rect>> = Vec::new();
    for (top, _left, textbox) in boxes {
        match rows.last_mut() {
            Some(row)
                if (top - row[0].top()).abs() <= ROW_MERGE_THRESHOLD_PX =>
            {
                row.push(textbox.rect);
            }
            _ => rows.push(vec![textbox.rect]),
        }
    }

    const ROW_PADDING_PX: i64 = 4;
    let (ew, eh) = (enlarged.width() as i64, enlarged.height() as i64);
    let mut results = Vec::with_capacity(rows.len());
    for row_boxes in rows {
        let min_x = row_boxes.iter().map(|r| r.left()).min().unwrap_or(0) as i64;
        let min_y = row_boxes.iter().map(|r| r.top()).min().unwrap_or(0) as i64;
        let max_x = row_boxes
            .iter()
            .map(|r| r.left() as i64 + r.width() as i64)
            .max()
            .unwrap_or(0);
        let max_y = row_boxes
            .iter()
            .map(|r| r.top() as i64 + r.height() as i64)
            .max()
            .unwrap_or(0);

        let x = (min_x - ROW_PADDING_PX).clamp(0, ew.saturating_sub(1));
        let y = (min_y - ROW_PADDING_PX).clamp(0, eh.saturating_sub(1));
        let width = ((max_x - min_x) + ROW_PADDING_PX * 2).clamp(1, ew - x);
        let height = ((max_y - min_y) + ROW_PADDING_PX * 2).clamp(1, eh - y);

        let row_crop = enlarged.crop_imm(x as u32, y as u32, width as u32, height as u32);
        let recognized = engine
            .recognize_text(&row_crop)
            .map_err(|e| anyhow::anyhow!("OCR row recognition failed: {e}"))?;

        if recognized.text.trim().is_empty() {
            continue;
        }

        // Report the rect back in the *original* (pre-2x-enlarge) image's
        // coordinate space, since that's what callers actually have.
        results.push(OcrRow {
            text: recognized.text,
            confidence: recognized.confidence,
            rect: (
                (x / 2) as u32,
                (y / 2) as u32,
                (width / 2).max(1) as u32,
                (height / 2).max(1) as u32,
            ),
        });
    }

    Ok(results)
}
```

- [x] **Step 2: Confirm the crate's actual API names before compiling**

```bash
grep -n "pub fn detect\b\|pub fn recognize_text\b" \
  ~/.cargo/registry/src/*/ocr-rs-2.3.4/src/engine.rs
```

Expected: both present on `impl OcrEngine`. (Already confirmed during planning; re-check here in case the locked version differs on the machine actually building this.)

- [x] **Step 3: Build to catch type errors**

```bash
cd /var/home/jedwards/wfinfo-ng && cargo build --release --bin orbiter 2>&1 | tail -60
```

Expected: builds clean. Common mismatches to watch for: `TextBox.rect` field access requires `imageproc::rect::Rect`'s `.top()`/`.left()`/`.width()`/`.height()` methods (already used elsewhere in this file for the existing `image_to_string()` sort, so the import should already be in scope) — if `imageproc::rect` isn't already imported in `ocr.rs`, add `use imageproc::rect::Rect;` or reference `imageproc::rect::Rect` fully qualified as written above.

- [ ] **Step 4: Commit**

```bash
git add src/ocr.rs
git commit -m "Add image_to_rows(): segment-first row detection + isolated per-row OCR"
```

---

### Task 2: Corpus-driven row accuracy test

**Files:**
- Modify: `src/bin/main.rs` (add a new `#[test]` in `mod test`, after `riven_corpus_manifest_is_well_formed` from the prior plan)

**Interfaces:**
- Consumes: `wfinfo::ocr::image_to_rows`, `wfinfo::ocr::normalize_string`, the `CorpusSample`/`CorpusCard`/`CorpusRow` types and `test-images/riven-corpus/manifest.json` (both from the corpus plan already implemented), and the existing `card_rects` cropping logic from `detect_riven_screen()` (main.rs, around line 414-423) — this task reads that match arm rather than duplicating its values by hand, since a future change to those crop rects should not silently desync this test.

- [x] **Step 1: Extract the card-rect lookup into a standalone function so both `detect_riven_screen()` and this new test can share it**

In `src/bin/main.rs`, find the existing inline match in `detect_riven_screen()`:

```rust
    let card_rects: &[(f32, f32, f32, f32)] = match mode {
        RivenScreenMode::Cycle => &[(0.38, 0.52, 0.24, 0.31)],
        RivenScreenMode::Confirm => &[(0.245, 0.59, 0.15, 0.21), (0.41, 0.59, 0.19, 0.21)],
    };
```

Replace it with a call to a new top-level function, and define that function just above `detect_riven_screen()`:

```rust
fn riven_card_rects(mode: RivenScreenMode) -> &'static [(f32, f32, f32, f32)] {
    match mode {
        RivenScreenMode::Cycle => &[(0.38, 0.52, 0.24, 0.31)],
        // A live test proved the previous y=0.64 start clipped the first line
        // of a two-line wrapped generated name (e.g. "Croni-" / "puratis"):
        // the raw OCR text came back as only "puratis", never "Croni-",
        // which then falsely conflicted with the visible stats and blocked
        // the grade forever. Raised the top edge by 0.05 (bottom edge, where
        // stats already parsed fine, is unchanged).
        RivenScreenMode::Confirm => &[(0.245, 0.59, 0.15, 0.21), (0.41, 0.59, 0.19, 0.21)],
    }
}
```

Then in `detect_riven_screen()`:

```rust
    let card_rects = riven_card_rects(mode);
```

(This is a pure refactor — no behavior change. It exists so this task's test uses the exact same crop rects production code uses, instead of a second hand-copied set that could quietly drift out of sync.)

- [x] **Step 2: Run the existing Riven fixture tests to confirm the refactor is behavior-preserving**

```bash
cd /var/home/jedwards/wfinfo-ng && cargo test --release --bin orbiter riven_ -- --nocapture
```

Expected: same tests pass as before this task (no new failures from the refactor alone).

- [x] **Step 3: Add the row-accuracy test**

Add to `src/bin/main.rs`'s `mod test` block, after `riven_corpus_manifest_is_well_formed`:

```rust
    #[test]
    fn riven_corpus_row_segmentation_report() {
        let manifest_path = "test-images/riven-corpus/manifest.json";
        let raw = read_to_string(manifest_path)
            .unwrap_or_else(|e| panic!("failed to read {manifest_path}: {e}"));
        let samples: Vec<CorpusSample> = serde_json::from_str(&raw)
            .unwrap_or_else(|e| panic!("failed to parse {manifest_path}: {e}"));

        let mut ocr: Option<OcrEngine> = None;
        let mut total_rows = 0usize;
        let mut exact_matches = 0usize;

        for sample in &samples {
            let labeled_cards: Vec<&CorpusCard> = sample
                .cards
                .iter()
                .filter(|c| c.note.as_deref() != Some("TODO_LABEL"))
                .collect();
            if labeled_cards.is_empty() {
                continue; // nothing labeled yet for this sample - skip, don't fail
            }

            let mode = match sample.mode.as_str() {
                "Cycle" => RivenScreenMode::Cycle,
                "Confirm" => RivenScreenMode::Confirm,
                other => panic!("unknown mode {other} in manifest"),
            };
            let image_path = format!("test-images/riven-corpus/{}", sample.image);
            let image = image::open(&image_path)
                .unwrap_or_else(|e| panic!("failed to open {image_path}: {e}"));
            let rects = riven_card_rects(mode);

            for (card, rect) in labeled_cards.iter().zip(rects.iter()) {
                let crop = relative_crop(&image, rect.0, rect.1, rect.2, rect.3);
                let rows = image_to_rows(&mut ocr, &crop)
                    .unwrap_or_else(|e| panic!("image_to_rows failed on {image_path}: {e}"));

                let got: Vec<String> = rows
                    .iter()
                    .map(|r| normalize_string(&r.text).to_ascii_lowercase())
                    .collect();
                let expected: Vec<String> = card
                    .rows
                    .iter()
                    .map(|r| normalize_string(&r.raw_text).to_ascii_lowercase())
                    .collect();

                total_rows += expected.len();
                for want in &expected {
                    if got.iter().any(|g| g == want) {
                        exact_matches += 1;
                    } else {
                        eprintln!(
                            "{image_path}: expected row {want:?} not found among detected rows {got:?}"
                        );
                    }
                }
            }
        }

        if total_rows == 0 {
            eprintln!(
                "riven_corpus_row_segmentation_report: no labeled rows in the corpus yet \
                 (all samples still TODO_LABEL) - nothing to measure"
            );
            return;
        }

        let accuracy = exact_matches as f32 / total_rows as f32;
        eprintln!(
            "riven_corpus_row_segmentation_report: {exact_matches}/{total_rows} rows exact-matched \
             ({:.1}% accuracy)",
            accuracy * 100.0
        );
        // Diagnostic, not a hard gate yet: this is the first real measurement
        // of row segmentation accuracy, establishing a baseline. Once there's
        // a real baseline number, a follow-up plan item should turn this into
        // an actual regression gate (fail if accuracy drops below the
        // measured baseline), per Codex's item 6 ("build a regression corpus
        // ... measure ... before tuning").
    }
```

- [x] **Step 4: Run it and record the baseline accuracy**

```bash
cd /var/home/jedwards/wfinfo-ng && cargo test --release --bin orbiter riven_corpus_row_segmentation_report -- --nocapture
```

Expected: test passes (it's diagnostic-only, doesn't assert a threshold), and stderr shows an `N/M rows exact-matched (X.X% accuracy)` line. Paste that output into the plan's own tracking (e.g. as a comment in the next plan, or a TODO.md update) so future work has a number to compare against — this is the number Codex's item 6 regression corpus is meant to produce.

Recorded 2026-07-30: `7/7 rows exact-matched (100.0% accuracy)`.

- [x] **Step 5: Run the full Riven suite once more to confirm nothing else broke**

```bash
cd /var/home/jedwards/wfinfo-ng && cargo test --release --bin orbiter riven_ -- --nocapture
```

- [ ] **Step 6: Commit**

```bash
git add src/bin/main.rs
git commit -m "Add corpus-driven row segmentation accuracy report for Riven OCR"
```

---

## Self-Review Notes

- **Spec coverage**: implements Codex item 2 ("segment first, recognize second") and lands the first slice of item 3 (confidence/geometry preserved via `OcrRow`) and item 6 (a real, if small, accuracy measurement against the corpus). Grammar-based decoding (item 4), ensemble multi-pass scoring (item 5), and screen-detection decoupling (item 7) are separate plans — this plan doesn't touch stat-name parsing or screen-open detection at all.
- **No placeholders**: the accuracy test is intentionally non-gating (diagnostic `eprintln!`, not an assertion threshold) because no baseline number exists yet to gate against — that's a real engineering decision (measure first, gate later), not a stubbed-out step; it says exactly what to do with the output (record it for the next plan).
- **Type consistency**: `OcrRow` fields (`text`, `confidence`, `rect`) and `image_to_rows()`'s signature in Task 1 match exactly what Task 2's test consumes. `riven_card_rects()` is introduced in Task 2 as a refactor of existing logic — its name/signature (`fn riven_card_rects(mode: RivenScreenMode) -> &'static [(f32, f32, f32, f32)]`) is used consistently in both the `detect_riven_screen()` call site and the new test.
