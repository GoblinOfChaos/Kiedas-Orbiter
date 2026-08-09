# Riven Stat-Based Grading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ONNX-price-CDF-derived riven grade (S/A/B/C/D/F) with wfinfo-ng's stat-based grading (good-combo matching + roll perfectness), while keeping the existing S-D grade scale, the ONNX price estimate display, and everything else about `RivenFullEstimate` unchanged.

**Architecture:** Port wfinfo-ng's `riven_good_rolls.json` (13836 lines: `legend` + per-weapon `good_combos`/`safe_negatives` profiles) into the Rust backend as bundled data. Port the `_grade_riven` scoring algorithm from `riven_grader_watcher.py` into a new Rust module. Compute roll "perfectness" (0-100%, currently missing from the JS-side riven stat data entirely) from the numeric stat values already parsed in `inventoryParser.js`. Wire the new grade into `estimate_full`/`estimate_full_batch` in `pricer.rs`, replacing only the `grade_from_cdf(cdf)` call — CDF/price/expected_value/weapon_rank all stay exactly as they are today.

**Tech Stack:** Rust (serde_json for the ported data file, new pure-Rust scoring module), existing `pricer.rs`/`main.rs` Tauri command surface, JS changes only where perfectness needs to be computed and passed through.

## Global Constraints

- GitHub issue: #81.
- Grade scale stays S/A/B/C/D (+F as today's fallback) — do not introduce new tier names or change `RivenCard.jsx`'s badge color logic beyond feeding it the new grade value.
- ONNX price estimate (`price`, `expected_value`, `cdf_percentile`, `weapon_rank`, `total_weapons`) must remain in `RivenFullEstimate` and continue to display exactly as today ("~340p est.") — only `grade` changes source.
- No feature work beyond the grade-source swap in this plan (e.g. don't add a "why this grade" explanation UI in this plan — that's a natural follow-up, not required here).

---

### Task 1: Port `riven_good_rolls.json` into the Rust backend as bundled data

**Files:**
- Create: `src-tauri/data/riven_good_rolls.json` (copy of `/var/home/jedwards/wfinfo-ng/riven_good_rolls.json`, verified in place)
- Create: `src-tauri/src/riven_grading.rs`
- Modify: `src-tauri/src/main.rs` (add `mod riven_grading;` near the other `mod` declarations)

**Interfaces:**
- Produces: `riven_grading::GoodRollData` (deserialized from the JSON), loaded once via `riven_grading::load_good_roll_data() -> Result<GoodRollData, String>`.

- [ ] **Step 1: Copy the data file**

```bash
cp /var/home/jedwards/wfinfo-ng/riven_good_rolls.json /var/home/jedwards/kiedas-orbiter/src-tauri/data/riven_good_rolls.json
```

- [ ] **Step 2: Define the deserialization structs**

```rust
// src-tauri/src/riven_grading.rs
use serde::Deserialize;
use std::collections::HashMap;

#[derive(Debug, Deserialize, Clone)]
pub struct GoodCombo {
    #[serde(default)]
    pub mandatory: Vec<String>,
    #[serde(default)]
    pub pick_from: Vec<String>,
    #[serde(default)]
    pub pick_n: u32,
}

#[derive(Debug, Deserialize, Clone)]
pub struct WeaponProfile {
    #[serde(default)]
    pub good_combos: Vec<GoodCombo>,
    #[serde(default)]
    pub safe_negatives: Vec<String>,
    #[serde(default)]
    pub notes: Option<String>,
    #[serde(default)]
    pub raw_positive: Option<String>,
    #[serde(default)]
    pub raw_negative: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct GoodRollData {
    pub legend: HashMap<String, String>,
    pub categories: HashMap<String, HashMap<String, WeaponProfile>>,
}
```

- [ ] **Step 3: Write the loader, sourced from the bundled data path (same pattern as other bundled JSON in this codebase)**

```rust
use crate::resolve_path;

pub fn load_good_roll_data() -> Result<GoodRollData, String> {
    let path = resolve_path("data/riven_good_rolls.json");
    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read riven_good_rolls.json: {}", e))?;
    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse riven_good_rolls.json: {}", e))
}
```

- [ ] **Step 4: Write a unit test confirming the file loads and parses without error**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn loads_and_parses_good_roll_data() {
        let data = load_good_roll_data().expect("should load and parse riven_good_rolls.json");
        assert!(data.legend.contains_key("CD"), "legend should have CD -> Critical Damage");
        assert!(data.categories.contains_key("primary"), "categories should have a primary slot");
        let primary = &data.categories["primary"];
        assert!(primary.contains_key("acceltra"), "primary should have an acceltra profile");
    }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd src-tauri && cargo test riven_grading::tests::loads_and_parses_good_roll_data`
Expected: PASS. If it fails on `resolve_path` not finding the file in a test context (tests may run from a different CWD than the built app), adjust `load_good_roll_data` to accept a base-path override for testing, or confirm `resolve_path`'s existing behavior in dev/test mode by checking how other bundled-data loaders in `main.rs` handle this (e.g. `check_pricer_models`/similar existing test coverage, if any).

- [ ] **Step 6: Register the module and commit**

Add `mod riven_grading;` to `main.rs` near the other module declarations (alongside `mod pricer;`, `mod ocr;`, etc.).

```bash
git add src-tauri/data/riven_good_rolls.json src-tauri/src/riven_grading.rs src-tauri/src/main.rs
git commit -m "Add riven_good_rolls.json data + loader for stat-based grading"
```

---

### Task 2: Port the `_grade_riven` scoring algorithm to Rust

**Files:**
- Modify: `src-tauri/src/riven_grading.rs`

**Interfaces:**
- Consumes: weapon name, positive stat codes (`Vec<String>`), negative stat codes (`Vec<String>`), `perfectness: f32` (0-100), the `GoodRollData` loaded in Task 1.
- Produces: `pub fn grade_riven(weapon_name: &str, positives: &[String], negatives: &[String], perfectness: f32, data: &GoodRollData) -> RivenGradeResult` where `RivenGradeResult { grade: String, label: String, score: i32 }`. `grade` is one of `"S"|"A"|"B"|"C"|"D"|"F"` (mapped from wfinfo-ng's `great`/`good`/`ok`/`weak`/`reroll`/`review` tiers per Task 2 Step 3 below).

- [ ] **Step 1: Read the full `_grade_riven` function before porting**

Read `/var/home/jedwards/wfinfo-ng/riven_grader_watcher.py` lines 416-535 in full (not just the summary from research) to get the exact scoring formula, tier thresholds, and the `GOD_ROLL_THRESHOLD` constant value, before writing the Rust port. Also read `_roll_perfectness`/`_curse_perfectness` (referenced near line 376-413) to understand exactly how `perfectness` is computed from raw stat values, since Task 3 needs to reproduce this in JS/Rust from data that doesn't currently carry it.

- [ ] **Step 2: Write the combo-scoring function with a table-driven test**

```rust
fn score_combo(combo: &GoodCombo, positives: &[String]) -> Option<i32> {
    let has_all_mandatory = combo.mandatory.iter().all(|m| positives.contains(m));
    if !has_all_mandatory {
        return None; // combo not applicable; caller tries next combo or falls back
    }
    let optional_hits = combo.pick_from.iter().filter(|s| positives.contains(s)).count() as i32;
    let capped = optional_hits.min(combo.pick_n as i32);
    let mut score = (combo.mandatory.len() as i32) * 10 + capped * 10;
    if optional_hits >= combo.pick_n as i32 {
        score += 5;
    }
    Some(score)
}
```

```rust
#[cfg(test)]
mod combo_scoring_tests {
    use super::*;

    #[test]
    fn scores_full_match_with_bonus() {
        let combo = GoodCombo {
            mandatory: vec!["MS".into()],
            pick_from: vec!["CD".into(), "TOX".into()],
            pick_n: 2,
        };
        let positives = vec!["MS".into(), "CD".into(), "TOX".into()];
        assert_eq!(score_combo(&combo, &positives), Some(10 + 20 + 5));
    }

    #[test]
    fn returns_none_when_mandatory_missing() {
        let combo = GoodCombo { mandatory: vec!["MS".into()], pick_from: vec![], pick_n: 0 };
        let positives = vec!["CD".into()];
        assert_eq!(score_combo(&combo, &positives), None);
    }
}
```

- [ ] **Step 3: Run the combo-scoring tests to verify they pass**

Run: `cd src-tauri && cargo test riven_grading::combo_scoring_tests`
Expected: PASS.

- [ ] **Step 4: Write `grade_riven`, porting the full tier logic found in Step 1**

Implement `grade_riven` using the exact thresholds/tier names read in Step 1 (this plan intentionally does not hardcode `GOD_ROLL_THRESHOLD` or the tier boundary percentages sight-unseen — copy them verbatim from the Python source). Map wfinfo-ng's six output tiers to the five-plus-F Rust/Kronos scale as follows (confirm this mapping still makes sense once Step 1's exact tier semantics are read, adjust if the Python tiers don't line up 1:1):

| wfinfo-ng tier | Kronos grade |
|---|---|
| great (God Roll, perfectness ≥ threshold) | S |
| great (other) | S |
| good | A |
| ok | B |
| ok (risky neg) | C |
| weak | D |
| reroll | D |
| review (no profile found) | F |

```rust
pub struct RivenGradeResult {
    pub grade: String,
    pub label: String,
    pub score: i32,
}

pub fn grade_riven(
    weapon_name: &str,
    positives: &[String],
    negatives: &[String],
    perfectness: f32,
    data: &GoodRollData,
) -> RivenGradeResult {
    // Find weapon profile across all category slots (mirrors Python's
    // per-slot dict lookup - try each category until found).
    let profile = data.categories.values().find_map(|slot| slot.get(weapon_name));

    let Some(profile) = profile else {
        return RivenGradeResult { grade: "F".into(), label: "No profile found".into(), score: 0 };
    };

    let best = profile.good_combos.iter()
        .filter_map(|c| score_combo(c, positives).map(|s| (s, c)))
        .max_by_key(|(s, _)| *s);

    // ... full tier logic ported from Step 1's reading of _grade_riven,
    // including the perfectness/GOD_ROLL_THRESHOLD check and the
    // risky-negative check against profile.safe_negatives ...
}
```

(This step's body is intentionally left to be completed against Step 1's actual reading of the Python source rather than guessed here — the struct/function signature and the tier-mapping table above are fixed; the internal branching must match the real `_grade_riven` logic line-for-line in intent.)

- [ ] **Step 5: Write grading tests using real weapon profiles from the ported data**

```rust
#[cfg(test)]
mod grade_riven_tests {
    use super::*;

    #[test]
    fn grades_a_strong_acceltra_roll_highly() {
        let data = load_good_roll_data().unwrap();
        let result = grade_riven(
            "acceltra",
            &["MS".into(), "CD".into(), "TOX".into()],
            &["IMP".into()], // safe negative per the acceltra profile
            95.0,
            &data,
        );
        assert!(matches!(result.grade.as_str(), "S" | "A"), "expected high grade, got {}", result.grade);
    }

    #[test]
    fn grades_unknown_weapon_as_f() {
        let data = load_good_roll_data().unwrap();
        let result = grade_riven("totally_not_a_real_weapon", &[], &[], 50.0, &data);
        assert_eq!(result.grade, "F");
    }
}
```

- [ ] **Step 6: Run the grading tests to verify they pass**

Run: `cd src-tauri && cargo test riven_grading::grade_riven_tests`
Expected: PASS. If the acceltra test fails, re-check the actual `good_combos`/`safe_negatives` for acceltra in the ported JSON (`categories.primary.acceltra`) and adjust the test's input stats to genuinely match a good combo per that real data, rather than adjusting the grading logic to fit a guessed test.

- [ ] **Step 7: Commit**

```bash
git add src-tauri/src/riven_grading.rs
git commit -m "Port wfinfo-ng's stat-based riven grading algorithm to Rust"
```

---

### Task 3: Compute roll perfectness and wire it through to the grading call

**Files:**
- Modify: `src/lib/inventoryParser.js` (`formatStat()`, ~line 1962-1972, and wherever `stats: [...buffs, ...curses]` is assembled)
- Modify: `src-tauri/src/pricer.rs` (`RivenInput` struct, `estimate_full`)
- Modify: `src-tauri/src/main.rs` (Tauri command signatures for `estimate_riven_full`/`estimate_riven_full_batch`)
- Modify: `src/screens/Rivens.jsx` (lines ~153-198, where `RivenInput`-shaped objects are built)

**Interfaces:**
- Consumes: raw per-stat roll values already available in `inventoryParser.js` (the numeric `Value` used to build `formatStat()`'s display string).
- Produces: `RivenInput` gains a new field `perfectness: f32` (0-100), populated on the JS side before calling `estimate_riven_full`/`estimate_riven_full_batch`, and threaded through to `riven_grading::grade_riven` in Task 4.

- [ ] **Step 1: Read wfinfo-ng's perfectness calculation in full**

Read `_roll_perfectness`/`_curse_perfectness` in `/var/home/jedwards/wfinfo-ng/riven_grader_watcher.py` (near lines 376-413, and wherever those two helper functions are actually defined if not inline) to get the exact formula — this is almost certainly `(actual_value - min_possible) / (max_possible - min_possible) * 100` per stat, averaged across positive stats (and inversely for curses, per `_curse_perfectness`'s separate name). Confirm whether min/max roll ranges come from a static table (likely present elsewhere in wfinfo-ng, e.g. `riven_stat_matching.py` or a constants file) and locate that table.

- [ ] **Step 2: Add a `computePerfectness(stats)` helper in `inventoryParser.js`**

```js
// Mirrors wfinfo-ng's _roll_perfectness/_curse_perfectness (riven_grader_watcher.py).
// stats: the same {tag, value, positive, rawTag, statKey, isPercent} array already
// built for display - this reads the raw numeric roll, not the formatted string.
function computePerfectness(stats) {
  // Body ported from Step 1's reading of the real min/max-per-stat table and formula.
  // Returns a 0-100 float, or 0 if stats is empty/unavailable.
}
```

(Exact formula body intentionally deferred to Step 1's findings, per the "no placeholders for logic we haven't read yet" principle — the function signature, input shape, and doc comment are fixed.)

- [ ] **Step 3: Write a unit test for `computePerfectness` (using whichever test runner this repo's JS uses — check `package.json` for `vitest`/`jest`)**

```js
import { computePerfectness } from './inventoryParser';

test('computes 100 perfectness for a max-roll positive stat', () => {
  const stats = [{ statKey: 'critical_chance', value: /* the known max-roll value for this stat */, positive: true }];
  expect(computePerfectness(stats)).toBeCloseTo(100, 0);
});

test('computes 0 perfectness for a min-roll positive stat', () => {
  const stats = [{ statKey: 'critical_chance', value: /* the known min-roll value */, positive: true }];
  expect(computePerfectness(stats)).toBeCloseTo(0, 0);
});
```

(Concrete min/max values filled in from Step 1's ported table — do not guess numbers here.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test inventoryParser` (or the project's actual test invocation — confirm via `package.json` `scripts.test`)
Expected: PASS.

- [ ] **Step 5: Add `perfectness` to `RivenInput` in Rust**

```rust
// src-tauri/src/pricer.rs
pub struct RivenInput {
    pub weapon_name: String,
    pub re_rolls: i32,
    pub positive1: Option<String>,
    pub positive2: Option<String>,
    pub positive3: Option<String>,
    pub negative: Option<String>,
    pub perfectness: f32, // NEW
}
```

Update every existing construction site of `RivenInput` in `pricer.rs`'s own tests (if any) to include the new field so the crate still compiles.

- [ ] **Step 6: Pass `perfectness` from `Rivens.jsx` into the invoke call**

At the `RivenInput`-shaped object construction (lines ~153-198), add `perfectness: computePerfectness(r.stats)` alongside the existing `positive1`/`positive2`/etc. fields.

- [ ] **Step 7: Build check**

Run: `cd src-tauri && cargo check` — confirms `RivenInput`'s new required field doesn't break compilation anywhere it's constructed.
Run: `pnpm exec vite build --mode production` — confirms the JS side builds clean.
Expected: both PASS with no errors.

- [ ] **Step 8: Commit**

```bash
git add src/lib/inventoryParser.js src-tauri/src/pricer.rs src/screens/Rivens.jsx
git commit -m "Compute riven roll perfectness and thread it through to RivenInput"
```

---

### Task 4: Swap `grade_from_cdf` for `riven_grading::grade_riven` in `estimate_full`

**Files:**
- Modify: `src-tauri/src/pricer.rs` (`fn estimate_full`, lines ~276-330)

**Interfaces:**
- Consumes: `riven_grading::grade_riven` (Task 2), `riven_grading::load_good_roll_data` (Task 1), `RivenInput.perfectness` (Task 3).
- Produces: `RivenFullEstimate.grade` now sourced from stat-based grading; every other `RivenFullEstimate` field unchanged.

- [ ] **Step 1: Write a regression test pinning today's `RivenFullEstimate` shape**

Before changing `estimate_full`, write a test that calls it with a known `RivenInput` and asserts on every field *except* `grade` (price, cdf_percentile, expected_value, weapon_rank, total_weapons) to lock in that this refactor doesn't accidentally change anything else.

```rust
#[cfg(test)]
mod estimate_full_grade_swap_tests {
    use super::*;

    #[test]
    fn non_grade_fields_unchanged_by_grading_swap() {
        let input = RivenInput {
            weapon_name: "acceltra".into(),
            re_rolls: 5,
            positive1: Some("Multishot".into()),
            positive2: Some("Critical Damage".into()),
            positive3: None,
            negative: Some("Impact".into()),
            perfectness: 80.0,
        };
        let result = estimate_full(&input).expect("should produce an estimate for a known weapon");
        // Assert price/cdf_percentile/expected_value/weapon_rank/total_weapons are all
        // still populated and internally consistent (e.g. cdf_percentile in [0,1]) -
        // exact expected values depend on the currently-loaded ONNX model/weapon_rankings,
        // so assert shape/range invariants here, not exact numbers.
        assert!(result.cdf_percentile >= 0.0 && result.cdf_percentile <= 1.0);
        assert!(result.weapon_rank > 0);
    }
}
```

- [ ] **Step 2: Run the test to verify it passes against current (pre-swap) behavior**

Run: `cd src-tauri && cargo test estimate_full_grade_swap_tests`
Expected: PASS (this confirms the test itself is valid before we change anything).

- [ ] **Step 3: Swap the grade source inside `estimate_full`**

Find the line that currently calls `grade_from_cdf(cdf)` and replace it:

```rust
// Before:
// let grade = grade_from_cdf(cdf);

// After:
let good_roll_data = crate::riven_grading::load_good_roll_data().ok();
let grade = match &good_roll_data {
    Some(data) => {
        let positives: Vec<String> = [&input.positive1, &input.positive2, &input.positive3]
            .into_iter().flatten().cloned().collect();
        let negatives: Vec<String> = input.negative.iter().cloned().collect();
        crate::riven_grading::grade_riven(&input.weapon_name, &positives, &negatives, input.perfectness, data).grade
    }
    None => grade_from_cdf(cdf), // fallback if data file failed to load, so grading never hard-fails
};
```

Note: loading `good_roll_data` fresh on every call is wasteful — if `estimate_full`/`estimate_full_batch` are called frequently (batch calls from `Rivens.jsx` suggest yes), this should be loaded once and cached (e.g. via `once_cell::sync::Lazy` or app state), not reloaded per riven. Do this as part of this step, not deferred — check `Cargo.toml` for whether `once_cell` (or similar) is already a dependency before adding a new one.

- [ ] **Step 4: Re-run the regression test from Step 1**

Run: `cd src-tauri && cargo test estimate_full_grade_swap_tests`
Expected: PASS — confirms non-grade fields are genuinely unchanged by the swap.

- [ ] **Step 5: Update `estimate_full_batch` the same way, or confirm it just calls `estimate_full` per-item**

Read `estimate_full_batch` (line 332) — if it's a thin wrapper calling `estimate_full` per input, no separate change is needed (the grade source change propagates automatically). If it duplicates the grading logic instead, apply the same swap there and add the equivalent regression test.

- [ ] **Step 6: Full test suite run**

Run: `cd src-tauri && cargo test`
Expected: all existing tests still PASS (this is a behavior swap on a widely-used function — confirm nothing else in the crate assumed CDF-based grading).

- [ ] **Step 7: Commit**

```bash
git add src-tauri/src/pricer.rs
git commit -m "Swap riven grade source from ONNX price CDF to stat-based grading

Fixes #81"
```

---

### Task 5: Manual end-to-end verification and issue closeout

**Files:** none (verification only)

- [ ] **Step 1: Build and run the app**

```bash
cd /var/home/jedwards/kiedas-orbiter
NO_STRIP=1 pnpm tauri build --bundles appimage
```

- [ ] **Step 2: Live-check grading against known rivens**

Open the Rivens tab with real riven inventory data. Pick 2-3 rivens you already have a strong intuition about (a genuinely great roll, a mediocre one, an off-meta weapon with no profile in `riven_good_rolls.json`). Confirm:
- The great roll grades S or A.
- The mediocre one grades lower.
- The off-meta weapon grades F (or whatever this plan's Task 2 mapped "review/no profile" to) rather than crashing or showing a stale/wrong grade.
- The ONNX price estimate text ("~340p est.") still displays unchanged.

- [ ] **Step 3: Close the issue with verification notes**

```bash
gh issue close 81 --repo GoblinOfChaos/Kiedas-Orbiter --comment "Implemented per docs/superpowers/plans/2026-08-08-riven-stat-based-grading.md. Ported riven_good_rolls.json + _grade_riven scoring from wfinfo-ng into src-tauri/src/riven_grading.rs, added roll-perfectness computation, and swapped estimate_full's grade source from grade_from_cdf to the new stat-based grading - ONNX price estimate and all other RivenFullEstimate fields unchanged. Verified live against [N] known rivens."
```

---

## Self-Review

- **Spec coverage:** Issue #81's exact ask — "swap the *grade* to be computed from wfinfo-ng's stat-based grading logic ... instead. Keep Kronos's ONNX price estimate displayed as-is" — is covered end to end: Task 1 (data), Task 2 (algorithm), Task 3 (missing perfectness input), Task 4 (the actual swap, with a regression test specifically protecting the "everything else stays the same" requirement), Task 5 (live verification against real data before closing).
- **Placeholder scan:** Two logic bodies (Task 2 Step 4's full tier branching, Task 3 Step 2's perfectness formula) are explicitly deferred to "read the real Python source first" rather than guessed/invented — this is intentional per the plan's own instructions to the implementer (read Step 1 of each task before writing Step 2+), not a placeholder for something that should already be known. Everything else (structs, signatures, test shapes, file paths, commit sequence) is concrete.
- **Type consistency:** `RivenGradeResult.grade: String` (Task 2) flows into `estimate_full`'s `grade` field (Task 4) matching `RivenFullEstimate.grade`'s existing type (also `String`, per the original struct read during research — not changed by this plan). `RivenInput.perfectness: f32` (Task 3 Step 5) matches the `f32` type used by `grade_riven`'s `perfectness: f32` parameter (Task 2 Step 4).
