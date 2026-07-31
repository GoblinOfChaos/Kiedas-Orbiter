# Riven Screen-Anchor OCR Rescue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement item 6 of the OCR research plan in `TODO.md` ("Remove screen lifecycle dependence on broad OCR") for the specific, well-documented failure mode: `riven_menu_anchor_present()` currently declares the Riven reroll screen "closed" purely because a small header/action-row OCR read failed — even when the actual card data is still reading perfectly fine. `TODO.md`'s Riven overlay diagnostic history has *many* live sessions chasing exactly this ("anchor OCR failing for well over a minute straight while Jacob was still genuinely on the Riven screen the whole time"), leading to a widened-to-60 recovery window as a workaround rather than a fix of the actual cause. Codex's research explicitly names the fix: "A missed MODS character should never invalidate an otherwise readable Riven card."

**Architecture:** Unlike Plans 2/4 in this series, this plan **does** change production behavior — but only in a way that can exclusively *rescue* an incorrect "closed" signal, never introduce a new false "open" one on top of what already runs today. `riven_menu_anchor_present()` (`src/bin/main.rs:442`) currently returns `false` immediately whenever the header ("INVENTORY / MODS") or action-row ("CYCLE FOR..."/"CONFIRM") OCR fails to match. This plan adds a fallback check, `riven_card_region_looks_valid()`, using the row-segmentation (`image_to_rows`, prior plan) and scoring (`score_rows`, prior plan) primitives already built for this OCR pipeline: when the anchor text fails, check whether any of the three known card regions (`riven_card_rects()` for both Cycle and Confirm modes) still contains confidently-recognized, stat-shaped rows. If so, the menu is almost certainly still open — a card can't be reading real stat text if the game has actually navigated away from the reroll screen — so treat it as present instead of counting a miss. This only runs on the already-failing path (header or action OCR already didn't match), so it adds no cost to the common case where the anchor reads correctly.

**Tech Stack:** Rust. Reuses `image_to_rows()` and `score_rows()` from the row-segmentation and ensemble-preprocessing plans already implemented in `src/ocr.rs` — no new dependency.

## Global Constraints

- Do not modify `detect_riven_screen()` or its mode/card-detection logic — this plan only touches `riven_menu_anchor_present()`, the separate close-detection guard used after a screen was already positively detected (see its own doc comment at `src/bin/main.rs:442`).
- Do not change `riven_menu_anchor_present()`'s behavior for the case where the anchor already matches (`header_ok && action_ok` both true) — that path must return `true` exactly as before, unchanged.
- Do not widen or otherwise touch the `misses`/`RECOVERY_CHECKS` counters in `riven_screen_watcher()` — this plan reduces how often a miss is wrongly recorded in the first place, rather than tuning how many misses are tolerated.
- Use the single-pass `image_to_rows()`, not the four-variant `best_of_image_to_rows()`, for the rescue check — this runs on a path that can repeat frequently during a flaky anchor-read streak, and the extra preprocessing cost isn't justified until this simpler version is proven insufficient live.
- `cargo test --release --bin orbiter riven_` must still pass unchanged after this plan.
- Do not make any change not explicitly specified by this plan's steps. If a step fails, doesn't match the current codebase (wrong line numbers, missing symbol, unexpected pre-existing changes in a file this plan touches, etc.), or produces an unexpected error, stop and report it back instead of improvising a fix or working around it.

---

### Task 1: `riven_card_region_looks_valid()` + wire into `riven_menu_anchor_present()`

**Files:**
- Modify: `src/bin/main.rs` (add a new function near `riven_menu_anchor_present()` around line 442; modify that function's two failure branches)
- Modify: `src/bin/main.rs`'s top-level `use wfinfo::{ ocr::{...} }` import block (around line 26-33) to add `image_to_rows` and `score_rows`

**Interfaces:**
- Produces: `fn riven_card_region_looks_valid(image: &DynamicImage) -> bool`
- Consumes: `wfinfo::ocr::{image_to_rows, score_rows, OCR}` (the last already imported), `riven_card_rects()` (added by the row-segmentation plan)

- [x] **Step 1: Confirm current line numbers before editing**

```bash
grep -n "fn riven_menu_anchor_present\|fn riven_card_rects\|^use wfinfo::{" -A 8 /var/home/jedwards/wfinfo-ng/src/bin/main.rs | head -40
```

Confirm `riven_menu_anchor_present` and `riven_card_rects` both still exist with the signatures this plan assumes (`fn riven_menu_anchor_present(image: &DynamicImage) -> bool`, `fn riven_card_rects(mode: RivenScreenMode) -> &'static [(f32, f32, f32, f32)]`). If not, stop and report back.

- [x] **Step 2: Add `image_to_rows` and `score_rows` to the top-level import**

Change:

```rust
use wfinfo::{
    database::Database,
    ocr::{
        image_to_string, normalize_string, reward_image_to_reward_names,
        reward_image_to_reward_names_with_rects, OCR,
    },
    utils::fetch_prices_and_items,
};
```

to:

```rust
use wfinfo::{
    database::Database,
    ocr::{
        image_to_rows, image_to_string, normalize_string, reward_image_to_reward_names,
        reward_image_to_reward_names_with_rects, score_rows, OCR,
    },
    utils::fetch_prices_and_items,
};
```

- [x] **Step 3: Add `riven_card_region_looks_valid()` just above `riven_menu_anchor_present()`**

```rust
/// Rescue check for riven_menu_anchor_present(): a missed header/action-row
/// OCR read should not, by itself, mean the Riven reroll screen closed -
/// TODO.md documents many live sessions where that exact assumption caused
/// false closes while the player never left the screen. If any of the
/// known card regions (Cycle's single card, or either of Confirm's two)
/// still contains confidently-recognized, stat-shaped rows, the screen is
/// still genuinely open: a card can't keep reading real stat text once
/// Warframe has actually navigated away from the reroll flow.
fn riven_card_region_looks_valid(image: &DynamicImage) -> bool {
    const SCORE_THRESHOLD: f32 = 0.5;
    const MIN_ROWS: usize = 2;

    let candidate_rects: Vec<(f32, f32, f32, f32)> = riven_card_rects(RivenScreenMode::Cycle)
        .iter()
        .chain(riven_card_rects(RivenScreenMode::Confirm).iter())
        .copied()
        .collect();

    let mut ocr = OCR.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
    for rect in candidate_rects {
        let crop = relative_crop(image, rect.0, rect.1, rect.2, rect.3);
        let rows = match image_to_rows(&mut ocr, &crop) {
            Ok(rows) => rows,
            Err(_) => continue,
        };
        if rows.len() >= MIN_ROWS && score_rows(&rows) >= SCORE_THRESHOLD {
            return true;
        }
    }
    false
}
```

- [x] **Step 4: Wire the rescue into both failure branches of `riven_menu_anchor_present()`**

Find:

```rust
    if !header_ok {
        // Diagnostic: a live session showed the detector declaring the
        // Riven screen closed (and, separately, staying closed well past
        // the recovery window) while Jacob insisted he never left the
        // menu - meaning this OCR read is intermittently failing on a
        // screen that's still genuinely open. Logging the actual raw
        // text on every failure (not just a bare "closed" event) is the
        // only way to see WHY without guessing again. Jacob 2026-07-27
        // ("why is this so hard").
        warn!("Riven anchor miss (header): {header_key:?}");
        return false;
    }
```

Replace with:

```rust
    if !header_ok {
        // Diagnostic: a live session showed the detector declaring the
        // Riven screen closed (and, separately, staying closed well past
        // the recovery window) while Jacob insisted he never left the
        // menu - meaning this OCR read is intermittently failing on a
        // screen that's still genuinely open. Logging the actual raw
        // text on every failure (not just a bare "closed" event) is the
        // only way to see WHY without guessing again. Jacob 2026-07-27
        // ("why is this so hard").
        warn!("Riven anchor miss (header): {header_key:?}");
        if riven_card_region_looks_valid(image) {
            info!("Riven anchor header miss rescued by still-valid card content");
            return true;
        }
        return false;
    }
```

Then find:

```rust
    let action_ok = action_key.contains("CYCLEF") || action_key.contains("FIRM");
    if !action_ok {
        warn!("Riven anchor miss (action row): {action_key:?}");
    }
    action_ok
}
```

Replace with:

```rust
    let action_ok = action_key.contains("CYCLEF") || action_key.contains("FIRM");
    if !action_ok {
        warn!("Riven anchor miss (action row): {action_key:?}");
        if riven_card_region_looks_valid(image) {
            info!("Riven anchor action-row miss rescued by still-valid card content");
            return true;
        }
    }
    action_ok
}
```

- [x] **Step 5: Build**

```bash
cd /var/home/jedwards/wfinfo-ng && cargo build --release --bin orbiter 2>&1 | tail -60
```

- [ ] **Step 6: Commit**

```bash
git add src/bin/main.rs
git commit -m "Rescue Riven anchor OCR misses when card content still reads validly"
```

---

### Task 2: Tests

**Files:**
- Modify: `src/bin/main.rs` (add tests in `mod test`, after the ensemble-preprocessing tests from the prior plan)

**Interfaces:**
- Consumes: `riven_card_region_looks_valid`, `riven_menu_anchor_present` (both same-module private functions, already reachable from `mod test` via `use super::*;`), the existing `test-images/riven-corpus/` fixtures.

- [x] **Step 1: Add tests using the real corpus fixtures (valid card content) and a synthetic blank image (no content at all)**

```rust
    #[test]
    fn riven_card_region_looks_valid_on_real_cycle_and_confirm_fixtures() {
        let cycle = image::open("test-images/riven-corpus/riven-cycle.png").unwrap();
        assert!(
            riven_card_region_looks_valid(&cycle),
            "real Cycle fixture's card region should score as valid"
        );

        let confirm = image::open("test-images/riven-corpus/riven-confirm.png").unwrap();
        assert!(
            riven_card_region_looks_valid(&confirm),
            "real Confirm fixture's card region should score as valid"
        );
    }

    #[test]
    fn riven_card_region_looks_valid_rejects_blank_image() {
        // A plain black image has no text anywhere - none of the three
        // candidate card regions should score as valid, unlike a real
        // screenshot where at least one always does.
        let blank = DynamicImage::ImageRgba8(image::RgbaImage::new(1920, 1080));
        assert!(
            !riven_card_region_looks_valid(&blank),
            "a blank image must never be treated as a valid card region"
        );
    }

    #[test]
    fn riven_menu_anchor_present_still_requires_action_row_when_no_card_rescues_it() {
        // A blank image has neither a readable header/action row NOR any
        // readable card content - riven_menu_anchor_present must still
        // correctly report the menu as absent (the rescue must not turn
        // into an unconditional "always true").
        let blank = DynamicImage::ImageRgba8(image::RgbaImage::new(1920, 1080));
        assert!(!riven_menu_anchor_present(&blank));
    }
```

- [x] **Step 2: Run the new tests**

```bash
cd /var/home/jedwards/wfinfo-ng && cargo test --release --bin orbiter riven_card_region -- --nocapture
cd /var/home/jedwards/wfinfo-ng && cargo test --release --bin orbiter riven_menu_anchor_present -- --nocapture
```

Expected: all pass.

- [x] **Step 3: Run the full Riven suite to confirm no regressions**

```bash
cd /var/home/jedwards/wfinfo-ng && cargo test --release --bin orbiter riven_ -- --nocapture
```

Expected: same pass count as before, plus the 3 new tests.

Recorded 2026-07-30: all 3 rescue-specific tests passed. The full Riven
subset passed 12/12. Automated validation is complete; a real live reroll
session that observes an anchor miss being rescued remains required before
the production behavior is considered live-confirmed.

- [ ] **Step 4: Commit**

```bash
git add src/bin/main.rs
git commit -m "Add tests for the Riven anchor OCR rescue path"
```

---

## Self-Review Notes

- **Spec coverage**: implements the specific, well-evidenced half of Codex item 6 ("A missed MODS character should never invalidate an otherwise readable Riven card"). Does not implement full template/color-anchor matching for the header/action row itself (Codex's other suggested techniques) — that would require empirically-calibrated pixel/color values from live screenshots this plan can't respect-safely guess at (unlike the OCR-based rescue, which reuses already-built, already-tested primitives). That remains a possible future follow-up if live testing shows this rescue alone isn't sufficient.
- **No placeholders**: `riven_card_region_looks_valid()` is complete and directly wired into both failure branches; the constants (`SCORE_THRESHOLD = 0.5`, `MIN_ROWS = 2`) are concrete starting values, flagged implicitly as tunable the same way the fuzzy-matcher constants in the grammar-decoding plan were.
- **Type consistency**: `riven_card_region_looks_valid(image: &DynamicImage) -> bool` matches how it's called from both `riven_menu_anchor_present()` branches and both new tests. Reuses `image_to_rows`/`score_rows`'s exact signatures from the already-implemented row-segmentation and ensemble-preprocessing plans, and `riven_card_rects()`'s exact signature from the row-segmentation plan.
- **Production risk**: this is the first plan in the OCR series to change live behavior rather than add inert/unused code. The change is one-directional (can only convert a false "closed" into a correct "still open," never the reverse, since it only runs after the existing check has already failed) — but per this project's established pattern (see `TODO.md`'s extensive live-diagnostic history for this exact code path), this should still get a real live Riven reroll test before being considered fully done, the same way every other change to this file has been.
