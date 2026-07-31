# Riven OCR Ensemble Preprocessing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement item 5 of the OCR research plan in `TODO.md` ("Add independently scored preprocessing passes") for Riven card OCR. Instead of running row segmentation (`image_to_rows()`, added in the prior plan) on a single preprocessing of the card crop, generate a small set of independently preprocessed variants, score each variant's row output, and return the best-scoring one — so a single bad preprocessing choice (e.g. low contrast under a colored card border, or animation blur) isn't the only chance at a correct read.

**Architecture:** All in `src/ocr.rs`, built entirely on the existing `image` crate (already a direct dependency — no new Cargo dependency needed). Four variants are generated from one input crop: the original color image (current behavior, unchanged baseline), plain grayscale (`DynamicImage::to_luma8()`), contrast-enhanced grayscale (`image::imageops::contrast()`), and an Otsu-thresholded pure black/white binary pass (hand-written — `imageproc` isn't a direct dependency of this crate, only a transitive one via `ocr-rs`, and Otsu's method is short enough to not justify adding it as a direct dependency for one function). Each variant is passed through `image_to_rows()` (from the prior plan), and each result is scored by a simple heuristic — average per-row OCR confidence, weighted up when rows look like real stat lines (contain a digit plus `%` or `x`, e.g. `+52.3%` or `x0.88`) — and the highest-scoring variant's rows win. This is purely additive: a new `best_of_image_to_rows()` function alongside `image_to_rows()`, not a replacement, and nothing in `detect_riven_screen()` or the live overlay path calls it yet.

**Tech Stack:** Rust, `image` crate 0.25 only (`to_luma8()`, `imageops::contrast()`, `GrayImage`/`ImageBuffer::from_fn()` — all already available via the existing `image = "0.25.10"` dependency).

## Global Constraints

- Do not modify `image_to_rows()` itself (added in the row-segmentation plan) — this plan calls it once per variant, unchanged.
- Do not modify `detect_riven_screen()`, `riven_ocr_region()`, or anything Python-side consumes — same additive-only rule as the prior two plans in this series.
- Do not add any new Cargo dependency. Otsu thresholding must be hand-written using only the existing `image` crate, not `imageproc` (transitive-only) or any other new crate.
- `cargo test --release --bin orbiter riven_` must still pass unchanged after this plan.
- Do not make any change not explicitly specified by this plan's steps. If a step fails, doesn't match the current codebase (wrong line numbers, missing symbol, unexpected pre-existing changes in a file this plan touches, etc.), or produces an unexpected error, stop and report it back instead of improvising a fix or working around it.

---

### Task 1: Preprocessing variants + row scoring in `src/ocr.rs`

**Files:**
- Modify: `src/ocr.rs` (add after `image_to_rows()`, the function added by the prior "row segmentation" plan — confirm its exact current location first with `grep -n "pub fn image_to_rows" src/ocr.rs` rather than assuming a line number, since this file has been edited by that plan since this document was written)

**Interfaces:**
- Produces:
  ```rust
  pub fn preprocessing_variants(image: &DynamicImage) -> Vec<(&'static str, DynamicImage)>

  pub fn score_rows(rows: &[OcrRow]) -> f32

  pub fn best_of_image_to_rows(
      ocr: &mut Option<OcrEngine>,
      image: &DynamicImage,
  ) -> Result<(&'static str, Vec<OcrRow>), anyhow::Error>
  ```
  `best_of_image_to_rows()`'s returned `&'static str` is the winning variant's label (`"original"`, `"grayscale"`, `"contrast_grayscale"`, or `"otsu_binary"`) — useful for logging/diagnostics and for the corpus test in Task 2 to report which variant won.

- [x] **Step 1: Confirm `image_to_rows()`'s current location and exact `OcrRow` field names**

```bash
grep -n "pub fn image_to_rows\|pub struct OcrRow" -A 5 /var/home/jedwards/wfinfo-ng/src/ocr.rs
```

Expected: `OcrRow { pub text: String, pub confidence: f32, pub rect: (u32, u32, u32, u32) }` and `pub fn image_to_rows(ocr: &mut Option<OcrEngine>, image: &DynamicImage) -> Result<Vec<OcrRow>, anyhow::Error>`, matching what the row-segmentation plan added. If either differs, stop and report back rather than adapting this plan's code to match — the plan below assumes exactly this shape.

- [x] **Step 2: Add Otsu thresholding, preprocessing variants, scoring, and the ensemble function**

Add immediately after `image_to_rows()`:

```rust
/// Otsu's method: finds the luma threshold that best separates an image
/// into two classes (text vs. background) by maximizing between-class
/// variance. Hand-written rather than pulling in imageproc as a direct
/// dependency (it's currently only a transitive dependency via ocr-rs)
/// for one function.
fn otsu_threshold(luma: &image::GrayImage) -> u8 {
    let mut histogram = [0u64; 256];
    for pixel in luma.pixels() {
        histogram[pixel.0[0] as usize] += 1;
    }
    let total: u64 = histogram.iter().sum();
    if total == 0 {
        return 128;
    }
    let sum: f64 = histogram
        .iter()
        .enumerate()
        .map(|(i, &count)| i as f64 * count as f64)
        .sum();

    let mut sum_background = 0.0f64;
    let mut weight_background = 0u64;
    let mut max_variance = 0.0f64;
    let mut threshold = 0u8;

    for (i, &count) in histogram.iter().enumerate() {
        weight_background += count;
        if weight_background == 0 {
            continue;
        }
        let weight_foreground = total - weight_background;
        if weight_foreground == 0 {
            break;
        }
        sum_background += i as f64 * count as f64;
        let mean_background = sum_background / weight_background as f64;
        let mean_foreground = (sum - sum_background) / weight_foreground as f64;
        let variance = weight_background as f64
            * weight_foreground as f64
            * (mean_background - mean_foreground).powi(2);
        if variance > max_variance {
            max_variance = variance;
            threshold = i as u8;
        }
    }
    threshold
}

fn binarize(luma: &image::GrayImage, threshold: u8) -> image::GrayImage {
    image::GrayImage::from_fn(luma.width(), luma.height(), |x, y| {
        let value = luma.get_pixel(x, y).0[0];
        image::Luma([if value >= threshold { 255u8 } else { 0u8 }])
    })
}

/// Independently-preprocessed variants of the same crop, so a single bad
/// preprocessing choice (low contrast, animation blur, a busy card
/// background) isn't the only chance row segmentation gets at a correct
/// read. "original" preserves today's baseline behavior exactly.
pub fn preprocessing_variants(image: &DynamicImage) -> Vec<(&'static str, DynamicImage)> {
    let luma = image.to_luma8();
    let contrast_luma = image::imageops::contrast(&luma, 30.0);
    let threshold = otsu_threshold(&luma);
    let binary = binarize(&luma, threshold);
    vec![
        ("original", image.clone()),
        ("grayscale", DynamicImage::ImageLuma8(luma)),
        ("contrast_grayscale", DynamicImage::ImageLuma8(contrast_luma)),
        ("otsu_binary", DynamicImage::ImageLuma8(binary)),
    ]
}

fn looks_like_stat_token(text: &str) -> bool {
    let has_digit = text.chars().any(|c| c.is_ascii_digit());
    let lower = text.to_ascii_lowercase();
    let has_marker = lower.contains('%') || lower.contains('x');
    has_digit && has_marker
}

/// Scores a set of detected rows for how likely they are to be a correct
/// Riven stat-line reading: average per-row OCR confidence, weighted up
/// when a healthy fraction of rows look like real numeric stat tokens
/// (contain a digit plus '%' or 'x', e.g. "+52.3%" or "x0.88") rather
/// than stray decorative/noise text. Zero rows always scores 0.0.
pub fn score_rows(rows: &[OcrRow]) -> f32 {
    if rows.is_empty() {
        return 0.0;
    }
    let numeric_rows = rows.iter().filter(|r| looks_like_stat_token(&r.text)).count();
    let numeric_fraction = numeric_rows as f32 / rows.len() as f32;
    let avg_confidence =
        rows.iter().map(|r| r.confidence).sum::<f32>() / rows.len() as f32;
    avg_confidence * (0.5 + 0.5 * numeric_fraction)
}

/// Runs row segmentation independently on several preprocessed variants
/// of the same crop and returns the rows from whichever variant scored
/// best. Returns the winning variant's label alongside its rows so
/// callers/tests can see which preprocessing actually won.
pub fn best_of_image_to_rows(
    ocr: &mut Option<OcrEngine>,
    image: &DynamicImage,
) -> Result<(&'static str, Vec<OcrRow>), anyhow::Error> {
    let variants = preprocessing_variants(image);
    let mut best: Option<(&'static str, Vec<OcrRow>, f32)> = None;
    for (label, variant) in variants {
        let rows = image_to_rows(ocr, &variant)?;
        let score = score_rows(&rows);
        let is_better = match &best {
            None => true,
            Some((_, _, best_score)) => score > *best_score,
        };
        if is_better {
            best = Some((label, rows, score));
        }
    }
    best.map(|(label, rows, _)| (label, rows))
        .ok_or_else(|| anyhow::anyhow!("no preprocessing variants were evaluated"))
}
```

- [x] **Step 3: Build**

```bash
cd /var/home/jedwards/wfinfo-ng && cargo build --release --bin orbiter 2>&1 | tail -60
```

Expected: builds clean. If `image::GrayImage::from_fn` or `image::imageops::contrast` don't resolve as written, check the exact re-export paths for the locked `image` version (`grep -n '^name = "image"' -A2 Cargo.lock`) and report back rather than guessing at alternate APIs.

- [ ] **Step 4: Commit**

```bash
git add src/ocr.rs
git commit -m "Add independently scored preprocessing passes for Riven row OCR"
```

---

### Task 2: Unit tests + corpus diagnostic

**Files:**
- Modify: `src/bin/main.rs` (add tests in the existing `mod test` block, after the row-segmentation report test from the prior plan)

**Interfaces:**
- Consumes: `wfinfo::ocr::{OcrRow, score_rows, preprocessing_variants, best_of_image_to_rows}`, the existing `test-images/riven-corpus/manifest.json` and `riven_card_rects()` helper (both already used by the prior plan's corpus test).

- [x] **Step 1: Add pure unit tests for `score_rows()` (no OCR engine needed — these construct `OcrRow` values directly)**

```rust
    #[test]
    fn score_rows_prefers_higher_confidence_numeric_looking_rows() {
        use wfinfo::ocr::{score_rows, OcrRow};

        let strong = vec![
            OcrRow { text: "+52.3% Electricity".into(), confidence: 0.95, rect: (0, 0, 10, 10) },
            OcrRow { text: "+49.1% Status Chance".into(), confidence: 0.92, rect: (0, 10, 10, 10) },
        ];
        let weak_noise = vec![
            OcrRow { text: "smudge".into(), confidence: 0.4, rect: (0, 0, 10, 10) },
        ];
        let empty: Vec<OcrRow> = vec![];

        assert!(score_rows(&strong) > score_rows(&weak_noise));
        assert_eq!(score_rows(&empty), 0.0);
    }

    #[test]
    fn score_rows_weights_confidence_even_without_numeric_tokens() {
        use wfinfo::ocr::{score_rows, OcrRow};

        let confident_but_not_numeric = vec![OcrRow {
            text: "Electricity".into(),
            confidence: 0.9,
            rect: (0, 0, 10, 10),
        }];
        let unconfident_and_not_numeric = vec![OcrRow {
            text: "Electricity".into(),
            confidence: 0.2,
            rect: (0, 0, 10, 10),
        }];
        assert!(
            score_rows(&confident_but_not_numeric) > score_rows(&unconfident_and_not_numeric)
        );
    }

    #[test]
    fn preprocessing_variants_produces_four_labeled_variants() {
        use wfinfo::ocr::preprocessing_variants;

        let image = image::open("test-images/riven-corpus/riven-cycle.png").unwrap();
        let variants = preprocessing_variants(&image);
        let labels: Vec<&str> = variants.iter().map(|(label, _)| *label).collect();
        assert_eq!(
            labels,
            vec!["original", "grayscale", "contrast_grayscale", "otsu_binary"]
        );
        for (label, variant) in &variants {
            assert!(
                variant.width() > 0 && variant.height() > 0,
                "{label} variant has zero-sized dimensions"
            );
        }
    }
```

- [x] **Step 2: Run the unit tests**

```bash
cd /var/home/jedwards/wfinfo-ng && cargo test --release --bin orbiter score_rows -- --nocapture
cd /var/home/jedwards/wfinfo-ng && cargo test --release --bin orbiter preprocessing_variants -- --nocapture
```

Expected: all pass.

- [x] **Step 3: Add the corpus-driven ensemble diagnostic**

Add after the tests above:

```rust
    #[test]
    fn riven_corpus_ensemble_preprocessing_report() {
        use wfinfo::ocr::best_of_image_to_rows;

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
                continue;
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
                let (winning_variant, rows) = best_of_image_to_rows(&mut ocr, &crop)
                    .unwrap_or_else(|e| panic!("best_of_image_to_rows failed on {image_path}: {e}"));

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
                            "{image_path} ({winning_variant} won): expected row {want:?} \
                             not found among detected rows {got:?}"
                        );
                    }
                }
                eprintln!("{image_path}: ensemble picked '{winning_variant}'");
            }
        }

        if total_rows == 0 {
            eprintln!("riven_corpus_ensemble_preprocessing_report: no labeled rows to measure");
            return;
        }

        let accuracy = exact_matches as f32 / total_rows as f32;
        eprintln!(
            "riven_corpus_ensemble_preprocessing_report: {exact_matches}/{total_rows} rows \
             exact-matched ({:.1}% accuracy)",
            accuracy * 100.0
        );
        // Diagnostic, not a hard gate: the current 2-sample corpus is clean
        // studio-quality captures where the "original" pass already scores
        // well (the row-segmentation plan measured 100% single-pass
        // accuracy on it already), so this test mainly confirms the
        // ensemble path runs correctly end-to-end and records which variant
        // wins on real fixtures - it is not expected to show an accuracy
        // *improvement* until noisier/animation-blurred samples are added
        // to the corpus (see the corpus README's suggested next additions).
    }
```

- [x] **Step 4: Run it and record which variant wins on the real fixtures**

```bash
cd /var/home/jedwards/wfinfo-ng && cargo test --release --bin orbiter riven_corpus_ensemble_preprocessing_report -- --nocapture
```

Expected: passes, and stderr shows which variant (`original`, `grayscale`, `contrast_grayscale`, or `otsu_binary`) won for each labeled card. Record this output the same way Plan 2's baseline was recorded, for future comparison once noisier corpus samples exist.

Recorded 2026-07-30: `7/7 rows exact-matched (100.0% accuracy)`.
`contrast_grayscale` won the Cycle fixture; `original` won both cards in the
Confirm fixture.

- [x] **Step 5: Run the full Riven suite to confirm no regressions**

```bash
cd /var/home/jedwards/wfinfo-ng && cargo test --release --bin orbiter riven_ -- --nocapture
```

- [ ] **Step 6: Commit**

```bash
git add src/bin/main.rs
git commit -m "Add ensemble preprocessing tests and corpus diagnostic for Riven OCR"
```

---

## Self-Review Notes

- **Spec coverage**: implements Codex item 5 ("Add independently scored preprocessing passes") using the specific pass types Codex's research named as what other Warframe OCR projects actually do (normal + aggressively thresholded + contrast-enhanced passes). Does not implement the "isolated purple text" pass Codex also mentioned — that needs a color-space-aware pass (isolating the game's specific stat-text hue) rather than a generic grayscale/threshold operation, and deserves its own follow-up once this simpler ensemble's real-world results are in, rather than being guessed at now.
- **No placeholders**: `otsu_threshold`, `binarize`, `preprocessing_variants`, `score_rows`, and `best_of_image_to_rows` are complete, runnable implementations, not stubs. The corpus diagnostic is intentionally non-gating for the same measured reason Plan 2's was (small, clean, already-100%-accurate corpus) — explicitly explained, not silently skipped.
- **Type consistency**: `best_of_image_to_rows()`'s return type `Result<(&'static str, Vec<OcrRow>), anyhow::Error>` matches exactly what Task 2's corpus test destructures (`let (winning_variant, rows) = ...`). `OcrRow` field names/types match the prior plan's definition exactly (verified via the Step 1 grep before writing any code that constructs `OcrRow` values).
