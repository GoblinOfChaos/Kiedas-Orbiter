# Riven OCR Model Benchmark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement item 7 of the OCR research plan in `TODO.md` ("Benchmark larger/English-specific models"). Measure the currently-used PaddleOCR PP-OCRv5 mobile model against three real alternatives — an English-only PP-OCRv5 recognition model, and the PP-OCRv6 "small"/"medium" tiers — on both accuracy against the existing Riven corpus and per-call inference latency. **This plan produces a measurement report, not a production model switch.** Whether to actually change `load_ocr_engine()`'s default model is a decision for Jacob to make after seeing the results, not something this plan decides.

**Architecture:** All three candidate models are real, verified files hosted directly in the `ocr-rs` crate maintainer's own GitHub repo (`zibo-chen/rust-paddle-ocr`, `next` branch, `models/` directory) — confirmed via the GitHub API (not scraped/guessed), with real non-placeholder file sizes:
- `en_PP-OCRv5_mobile_rec_infer.mnn` (English-only recognition, ~3.8MB) + `ppocr_keys_en.txt` — pairs with the *existing* `ocr-models/PP-OCRv5_mobile_det.mnn` detector (script-specific recognition models share the universal detector per the crate's own README).
- `PP-OCRv6_small_det.mnn` + `PP-OCRv6_small_rec.mnn` + `ppocr_keys_v6_small.txt` ("balanced" tier per the crate README).
- `PP-OCRv6_medium_det.mnn` + `PP-OCRv6_medium_rec.mnn` + `ppocr_keys_v6_medium.txt` ("accuracy-first" tier per the crate README).

These download into a new `ocr-models-bench/` directory that is **gitignored, not committed** — unlike the production `ocr-models/` (committed per Jacob's explicit call to keep the app self-contained), these are throwaway candidates for this one-time comparison; only promoting a winner to production would make its files worth committing, and that's a follow-up decision, not this plan's job.

`load_ocr_engine()` in `src/ocr.rs` is refactored (behavior-preserving) into a thin wrapper around a new parameterized `load_ocr_engine_from(det_path, rec_path, keys_path)`, so the benchmark can build engines from arbitrary model paths without duplicating engine-construction logic or touching the production path's actual model choice.

A new `#[ignore]`d Rust test builds an engine for each present candidate, runs it against the existing `test-images/riven-corpus/` fixtures (same row-accuracy method Plans 2/4 already established), and times inference per call. It's `#[ignore]`d because it requires the large downloaded model files and takes much longer than the normal test suite — run explicitly, not as part of routine `cargo test`.

**Tech Stack:** Rust, `ocr-rs` 2.3.4 (`OcrEngine::new()` with arbitrary model paths — same constructor `load_ocr_engine()` already uses). `curl` for downloading the benchmark models (already used elsewhere in this project's tooling).

## Global Constraints

- Work on a dedicated branch for this plan (e.g. `plan/ocr-model-benchmark`), not `main`. Once all tasks are complete and validated, open a pull request via GitKraken (`pull_request_create`) targeting `main` for Jacob to review, rather than committing directly to `main`.
- Do not change `load_ocr_engine()`'s actual model paths (still `ocr-models/PP-OCRv5_mobile_det.mnn` / `PP-OCRv5_mobile_rec.mnn` / `ppocr_keys_v5.txt`) — the refactor in Task 1 must be behavior-preserving. Switching the production default is explicitly out of scope for this plan.
- Do not commit any file under `ocr-models-bench/` — it must be gitignored. Only `ocr-models/` (the production models, already committed) stays tracked.
- Do not modify `image_to_rows()`, `score_rows()`, `best_of_image_to_rows()`, or any Riven detection/grading logic — this plan only adds a benchmarking harness that reuses those functions against alternate engines.
- `cargo test --release --bin orbiter riven_` (the normal, non-ignored suite) must still pass unchanged after this plan.
- Do not make any change not explicitly specified by this plan's steps. If a step fails, doesn't match the current codebase (wrong line numbers, missing symbol, unexpected pre-existing changes in a file this plan touches, etc.), or produces an unexpected error, stop and report it back instead of improvising a fix or working around it.

---

### Task 1: Download benchmark models + gitignore them

**Files:**
- Create: `ocr-models-bench/en-v5/en_PP-OCRv5_mobile_rec_infer.mnn`, `ocr-models-bench/en-v5/ppocr_keys_en.txt`
- Create: `ocr-models-bench/v6-small/PP-OCRv6_small_det.mnn`, `ocr-models-bench/v6-small/PP-OCRv6_small_rec.mnn`, `ocr-models-bench/v6-small/ppocr_keys_v6_small.txt`
- Create: `ocr-models-bench/v6-medium/PP-OCRv6_medium_det.mnn`, `ocr-models-bench/v6-medium/PP-OCRv6_medium_rec.mnn`, `ocr-models-bench/v6-medium/ppocr_keys_v6_medium.txt`
- Modify: `.gitignore`

- [x] **Step 1: Download the candidate model files**

```bash
cd /var/home/jedwards/wfinfo-ng
mkdir -p ocr-models-bench/en-v5 ocr-models-bench/v6-small ocr-models-bench/v6-medium

curl -fL -o ocr-models-bench/en-v5/en_PP-OCRv5_mobile_rec_infer.mnn \
  https://raw.githubusercontent.com/zibo-chen/rust-paddle-ocr/next/models/en_PP-OCRv5_mobile_rec_infer.mnn
curl -fL -o ocr-models-bench/en-v5/ppocr_keys_en.txt \
  https://raw.githubusercontent.com/zibo-chen/rust-paddle-ocr/next/models/ppocr_keys_en.txt

curl -fL -o ocr-models-bench/v6-small/PP-OCRv6_small_det.mnn \
  https://raw.githubusercontent.com/zibo-chen/rust-paddle-ocr/next/models/PP-OCRv6_small_det.mnn
curl -fL -o ocr-models-bench/v6-small/PP-OCRv6_small_rec.mnn \
  https://raw.githubusercontent.com/zibo-chen/rust-paddle-ocr/next/models/PP-OCRv6_small_rec.mnn
curl -fL -o ocr-models-bench/v6-small/ppocr_keys_v6_small.txt \
  https://raw.githubusercontent.com/zibo-chen/rust-paddle-ocr/next/models/ppocr_keys_v6_small.txt

curl -fL -o ocr-models-bench/v6-medium/PP-OCRv6_medium_det.mnn \
  https://raw.githubusercontent.com/zibo-chen/rust-paddle-ocr/next/models/PP-OCRv6_medium_det.mnn
curl -fL -o ocr-models-bench/v6-medium/PP-OCRv6_medium_rec.mnn \
  https://raw.githubusercontent.com/zibo-chen/rust-paddle-ocr/next/models/PP-OCRv6_medium_rec.mnn
curl -fL -o ocr-models-bench/v6-medium/ppocr_keys_v6_medium.txt \
  https://raw.githubusercontent.com/zibo-chen/rust-paddle-ocr/next/models/ppocr_keys_v6_medium.txt
```

- [x] **Step 2: Verify none of the downloads are truncated or Git-LFS pointer stubs**

```bash
cd /var/home/jedwards/wfinfo-ng
for f in ocr-models-bench/en-v5/en_PP-OCRv5_mobile_rec_infer.mnn \
         ocr-models-bench/v6-small/PP-OCRv6_small_det.mnn \
         ocr-models-bench/v6-small/PP-OCRv6_small_rec.mnn \
         ocr-models-bench/v6-medium/PP-OCRv6_medium_det.mnn \
         ocr-models-bench/v6-medium/PP-OCRv6_medium_rec.mnn; do
  size=$(stat -c '%s' "$f" 2>/dev/null || echo 0)
  echo "$f: ${size} bytes"
  if [ "$size" -lt 1000000 ]; then
    echo "WARNING: $f looks too small to be a real model file - stop and report back"
  fi
done
```

Expected: `en_PP-OCRv5_mobile_rec_infer.mnn` ~3.9MB, `PP-OCRv6_small_det.mnn` ~5.0MB, `PP-OCRv6_small_rec.mnn` ~10.6MB, `PP-OCRv6_medium_det.mnn` ~31.1MB, `PP-OCRv6_medium_rec.mnn` ~38.4MB. If any file is only a few hundred bytes, the download failed (likely got an HTML error page instead of the binary) - stop and report back rather than proceeding with a broken model file.

- [x] **Step 3: Gitignore the benchmark models directory**

Add to `.gitignore`, in the section near the existing `ExportModSet.json`/`ExportUpgrades.json` "auto-downloaded" comment (or a new clearly-labeled section):

```
# OCR model benchmark candidates (large, auto-downloaded, throwaway -
# only a promoted winner would ever get committed, under ocr-models/)
ocr-models-bench/
```

- [x] **Step 4: Commit**

```bash
git checkout -b plan/ocr-model-benchmark
git add .gitignore
git commit -m "Gitignore OCR model benchmark candidates directory"
```

---

### Task 2: Parameterize `load_ocr_engine()` (behavior-preserving refactor)

**Files:**
- Modify: `src/ocr.rs`

**Interfaces:**
- Produces: `fn load_ocr_engine_from(det_path: &Path, rec_path: &Path, keys_path: &Path) -> Result<OcrEngine, anyhow::Error>`
- `load_ocr_engine()` keeps its existing signature and behavior exactly, now implemented by calling the new function with the same hardcoded production paths it always used.

- [x] **Step 1: Refactor `load_ocr_engine()`**

Find:

```rust
fn load_ocr_engine() -> Result<OcrEngine, anyhow::Error> {
    let det_path = Path::new("ocr-models/PP-OCRv5_mobile_det.mnn");
    let rec_path = Path::new("ocr-models/PP-OCRv5_mobile_rec.mnn");
    let keys_path = Path::new("ocr-models/ppocr_keys_v5.txt");
    if !det_path.exists() || !rec_path.exists() || !keys_path.exists() {
        anyhow::bail!(
            "OCR model files not found (expected ocr-models/PP-OCRv5_mobile_det.mnn, \
             PP-OCRv5_mobile_rec.mnn, and ppocr_keys_v5.txt relative to the current directory)"
        );
    }
    OcrEngine::new(det_path, rec_path, keys_path, None)
        .map_err(|e| anyhow::anyhow!("could not initialize OCR engine: {e}"))
}
```

Replace with:

```rust
/// Builds an OcrEngine from an arbitrary det/rec/charset model triple.
/// Used both by load_ocr_engine() (the fixed production model) and by
/// the model-benchmark harness (arbitrary candidate models) so engine
/// construction isn't duplicated between them.
pub fn load_ocr_engine_from(
    det_path: &Path,
    rec_path: &Path,
    keys_path: &Path,
) -> Result<OcrEngine, anyhow::Error> {
    if !det_path.exists() || !rec_path.exists() || !keys_path.exists() {
        anyhow::bail!(
            "OCR model files not found (expected {}, {}, and {})",
            det_path.display(),
            rec_path.display(),
            keys_path.display()
        );
    }
    OcrEngine::new(det_path, rec_path, keys_path, None)
        .map_err(|e| anyhow::anyhow!("could not initialize OCR engine: {e}"))
}

fn load_ocr_engine() -> Result<OcrEngine, anyhow::Error> {
    load_ocr_engine_from(
        Path::new("ocr-models/PP-OCRv5_mobile_det.mnn"),
        Path::new("ocr-models/PP-OCRv5_mobile_rec.mnn"),
        Path::new("ocr-models/ppocr_keys_v5.txt"),
    )
}
```

- [x] **Step 2: Build and run the existing suite to confirm this refactor changed nothing observable**

```bash
cd /var/home/jedwards/wfinfo-ng
cargo build --release --bin orbiter 2>&1 | tail -40
cargo test --release --bin orbiter riven_ -- --nocapture
```

Expected: identical pass count to before this task - this step must not change any test's outcome, since production model paths are untouched.

- [x] **Step 3: Commit**

```bash
git add src/ocr.rs
git commit -m "Parameterize load_ocr_engine() for the model-benchmark harness"
```

---

### Task 3: Benchmark harness

**Files:**
- Modify: `src/bin/main.rs` (add to `mod test`, after the ensemble-preprocessing tests)

**Interfaces:**
- Consumes: `wfinfo::ocr::{load_ocr_engine_from, image_to_rows, normalize_string, OcrRow}`, `riven_card_rects()`, the existing corpus manifest/types.

- [x] **Step 1: Add the benchmark test**

```rust
    #[test]
    #[ignore] // requires ocr-models-bench/ (large downloaded candidate models); run explicitly
    fn ocr_model_benchmark() {
        use std::time::Instant;
        use wfinfo::ocr::load_ocr_engine_from;

        struct Candidate {
            label: &'static str,
            det: &'static str,
            rec: &'static str,
            keys: &'static str,
        }

        let candidates = [
            Candidate {
                label: "production (PP-OCRv5 mobile)",
                det: "ocr-models/PP-OCRv5_mobile_det.mnn",
                rec: "ocr-models/PP-OCRv5_mobile_rec.mnn",
                keys: "ocr-models/ppocr_keys_v5.txt",
            },
            Candidate {
                label: "PP-OCRv5 English-only recognition",
                det: "ocr-models/PP-OCRv5_mobile_det.mnn",
                rec: "ocr-models-bench/en-v5/en_PP-OCRv5_mobile_rec_infer.mnn",
                keys: "ocr-models-bench/en-v5/ppocr_keys_en.txt",
            },
            Candidate {
                label: "PP-OCRv6 small",
                det: "ocr-models-bench/v6-small/PP-OCRv6_small_det.mnn",
                rec: "ocr-models-bench/v6-small/PP-OCRv6_small_rec.mnn",
                keys: "ocr-models-bench/v6-small/ppocr_keys_v6_small.txt",
            },
            Candidate {
                label: "PP-OCRv6 medium",
                det: "ocr-models-bench/v6-medium/PP-OCRv6_medium_det.mnn",
                rec: "ocr-models-bench/v6-medium/PP-OCRv6_medium_rec.mnn",
                keys: "ocr-models-bench/v6-medium/ppocr_keys_v6_medium.txt",
            },
        ];

        let manifest_path = "test-images/riven-corpus/manifest.json";
        let raw = read_to_string(manifest_path)
            .unwrap_or_else(|e| panic!("failed to read {manifest_path}: {e}"));
        let samples: Vec<CorpusSample> = serde_json::from_str(&raw)
            .unwrap_or_else(|e| panic!("failed to parse {manifest_path}: {e}"));

        println!(
            "\n{:<32} {:>10} {:>10} {:>14}",
            "model", "rows_ok", "rows_total", "avg_ms/call"
        );

        for candidate in &candidates {
            let det = std::path::Path::new(candidate.det);
            let rec = std::path::Path::new(candidate.rec);
            let keys = std::path::Path::new(candidate.keys);
            if !det.exists() || !rec.exists() || !keys.exists() {
                println!(
                    "{:<32} SKIPPED (model files not present - run Task 1's download step)",
                    candidate.label
                );
                continue;
            }

            let engine = match load_ocr_engine_from(det, rec, keys) {
                Ok(e) => e,
                Err(e) => {
                    println!("{:<32} FAILED TO LOAD: {e}", candidate.label);
                    continue;
                }
            };
            let mut ocr = Some(engine);

            let mut exact_matches = 0usize;
            let mut total_rows = 0usize;
            let mut total_calls = 0u32;
            let mut total_elapsed = std::time::Duration::ZERO;

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

                    let start = Instant::now();
                    let rows = image_to_rows(&mut ocr, &crop);
                    total_elapsed += start.elapsed();
                    total_calls += 1;

                    let rows = match rows {
                        Ok(rows) => rows,
                        Err(_) => continue,
                    };
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
                        }
                    }
                }
            }

            let avg_ms = if total_calls > 0 {
                total_elapsed.as_secs_f64() * 1000.0 / total_calls as f64
            } else {
                0.0
            };
            println!(
                "{:<32} {:>10} {:>10} {:>14.1}",
                candidate.label, exact_matches, total_rows, avg_ms
            );
        }

        println!(
            "\nThis is a measurement report only - no production model was changed. \
             Compare rows_ok/rows_total and avg_ms/call across models before deciding \
             whether switching load_ocr_engine()'s default is worthwhile; a larger model \
             that is only marginally more accurate on this small corpus but meaningfully \
             slower may not be a good trade for the 500ms-cadence live Riven capture loop."
        );
    }
```

- [x] **Step 2: Run the benchmark**

```bash
cd /var/home/jedwards/wfinfo-ng
cargo test --release --bin orbiter ocr_model_benchmark -- --ignored --nocapture
```

Expected: a printed table comparing all four models' corpus row-match accuracy and average per-call latency. Record this output somewhere durable (e.g. paste it into this plan file's own tracking, or a TODO.md follow-up entry) so the comparison isn't lost.

Benchmark result (2026-07-30, release build, 7 labeled rows):

| model | rows_ok | rows_total | avg_ms/call |
|---|---:|---:|---:|
| production (PP-OCRv5 mobile) | 7 | 7 | 132.6 |
| PP-OCRv5 English-only recognition | 7 | 7 | 159.7 |
| PP-OCRv6 small | 7 | 7 | 194.0 |
| PP-OCRv6 medium | 7 | 7 | 570.3 |

No production model was changed.

- [x] **Step 3: Run the normal (non-ignored) suite to confirm nothing else broke**

```bash
cargo test --release --bin orbiter riven_ -- --nocapture
```

- [x] **Step 4: Commit**

```bash
git add src/bin/main.rs
git commit -m "Add ignored OCR model benchmark comparing PP-OCRv5 mobile vs English-only vs PP-OCRv6 small/medium"
```

- [ ] **Step 5: Push the branch and open a PR for review**

```bash
git push -u origin plan/ocr-model-benchmark
```

Then use GitKraken's `pull_request_create` to open a PR from `plan/ocr-model-benchmark` into `main`, with a description summarizing the benchmark table from Step 2 so Jacob can review the actual numbers (not just the code) before deciding whether to act on them. Do not merge the PR - that decision belongs to Jacob.

---

## Self-Review Notes

- **Spec coverage**: implements Codex item 7 ("Benchmark larger/English-specific models") using real, verified model sources rather than assumed URLs - every download URL and file size was confirmed against the GitHub API before being included in this plan, not guessed. Explicitly does not implement item 8 (fine-tuning) - that's correctly gated on this benchmark's results first, per Codex's own stated ordering.
- **No placeholders**: the benchmark test is a complete, runnable comparison, not a stub. It gracefully skips (not fails) any candidate whose model files aren't present, so a partial download doesn't block the whole benchmark.
- **Type consistency**: `load_ocr_engine_from()`'s signature in Task 2 matches exactly how Task 3's benchmark calls it. Reuses `CorpusSample`/`CorpusCard`/`riven_card_rects()`/`image_to_rows()` exactly as defined in the already-implemented corpus and row-segmentation plans.
- **Honesty about limitations**: the corpus currently has only 2 labeled samples (7 rows total), so accuracy differences between models may not be statistically meaningful - the benchmark output explicitly frames latency as an equally important signal, not just accuracy, and defers the actual switch-or-not decision to Jacob rather than the benchmark numbers alone.
- **Workflow**: per the new standing instruction, this plan works on `plan/ocr-model-benchmark` and ends with a PR via GitKraken rather than committing to `main` directly, unlike Plans 1-5.
