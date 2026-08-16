# Riven Stat-Based Grading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ONNX-price-CDF-derived riven grade (S/A/B/C/D) with a stat-based grade, while keeping the existing grade scale, the ONNX price estimate display, and everything else about `RivenFullEstimate` unchanged.

**Architecture — REVISED after external research (2026-08-08):** The original plan was to port wfinfo-ng's `riven_good_rolls.json` (13,836-line hand-curated "good combos per weapon" lookup table) and its matching Python scorer. Before implementing, we researched whether a better existing solution exists. Finding: no actively-maintained WFCD or community dataset curates per-weapon good-combos, and the dominant, well-regarded community methodology is **formula-based, not lookup-table-based** — normalize each rolled stat against its min/max range, weight by the weapon's riven disposition and by how generally valuable that stat type is (crit/multishot weighted higher than flat damage), sum, threshold into a letter grade. This generalizes to every weapon automatically with no per-weapon curation, avoids an immediately-stale 13,800-line JSON file, and matches what real tools (`calamity-inc/warframe-riven-info`'s `RivenParser.js`) actually do. **This plan now builds the formula-based grader instead of porting the lookup-table approach.** wfinfo-ng's `_grade_riven` is no longer the primary reference — study `calamity-inc/warframe-riven-info`'s `RivenParser.js` instead (Task 1).

**Tech Stack:** Rust (pure scoring module, no ONNX involvement), WFCD disposition data (already available via this app's existing WFCD data pipeline — confirm exact source in Task 1), existing `pricer.rs`/`main.rs` Tauri command surface.

## Global Constraints

- GitHub issue: #81.
- Grade scale stays S/A/B/C/D (+F as today's fallback) — do not introduce new tier names or change `RivenCard.jsx`'s badge color logic beyond feeding it the new grade value.
- ONNX price estimate (`price`, `expected_value`, `cdf_percentile`, `weapon_rank`, `total_weapons`) must remain in `RivenFullEstimate` and continue to display exactly as today ("~340p est.") — only `grade` changes source.
- Do NOT port `riven_good_rolls.json` or wfinfo-ng's `_grade_riven` combo-matching logic — that approach was rejected after research (see Architecture above). If formula-based grading turns out to be materially worse in practice during Task 4's live verification, fall back to reconsidering the lookup-table approach only then, with evidence, not preemptively.

---

### Task 1: Study the reference implementation and source disposition + stat-weight data

**Files:** none (research/data-gathering task; produces the concrete tables Task 2 implements against)

- [ ] **Step 1: Pull and read `calamity-inc/warframe-riven-info`'s `RivenParser.js` in full**

```bash
git clone --depth 1 https://github.com/calamity-inc/warframe-riven-info /tmp/warframe-riven-info-ref
cat /tmp/warframe-riven-info-ref/RivenParser.js  # or wherever it lives in that repo's tree - find via find/grep if path differs
```

Read the full scoring formula: exactly how it normalizes a rolled stat value to the -10..+10 scale, how disposition factors in, the stat-weight table (which stats are weighted higher/lower), and the letter-grade thresholds it maps the final score to. Also skim `StepTwo33/VoidForge` and `munir-a-khan/rivenforge` (found in research) if `RivenParser.js` is unclear on any point, since multiple independent implementations converging on the same approach is useful confirmation.

- [ ] **Step 2: Source riven disposition data for this app**

Rivens have a per-weapon "disposition" (a multiplier, roughly 0.5-1.55, DE-set per weapon, affecting roll ranges) — confirm where this app already gets this. Check `src-tauri/data/` for existing WFCD export data (`ExportWeapons`, `ExportUpgrades`, or similar) already bundled per the app's existing data pipeline — riven disposition is standard WFCD/DE export data and this app likely already has it for other purposes (weapon stats display). Do not fetch a new data source if it's already present; only add a new one if it's genuinely missing.

- [ ] **Step 3: Determine min/max roll ranges per stat**

The formula needs each stat's min/max possible roll (to normalize an actual roll to 0-100% or -10..+10). Check whether `RivenParser.js` (Step 1) hardcodes these or derives them from disposition + a base range table; if the latter, source that base range table the same way (likely also standard DE/WFCD data, check `ExportUpgrades`/`ExportWeapons` again before assuming a new source is needed).

- [ ] **Step 4: Write up the concrete formula and tables as a short reference doc**

Before writing Rust code, write out in plain terms (a comment block is fine, doesn't need a separate file): the exact normalization formula, the exact stat-weight table (list every stat and its weight), and the exact score→grade thresholds, all copied from Step 1's reading — this becomes Task 2's direct implementation reference, so there's no ambiguity mid-implementation.

---

### Task 2: Implement the formula-based grader in Rust

**Files:**
- Create: `src-tauri/src/riven_grading.rs`
- Modify: `src-tauri/src/main.rs` (add `mod riven_grading;`)

**Interfaces:**
- Produces: `pub fn grade_riven(weapon_name: &str, stats: &[RivenStatRoll], disposition: f32) -> RivenGradeResult`, where `RivenStatRoll = {stat_code: String, value: f32, is_negative: bool}` (one entry per rolled stat, positive or negative) and `RivenGradeResult = {grade: String, score: f32}`.

- [ ] **Step 1: Define the stat-weight table as a Rust const, copied verbatim from Task 1 Step 4's reference doc**

```rust
// src-tauri/src/riven_grading.rs
use std::collections::HashMap;
use once_cell::sync::Lazy;

// Stat weights, copied from calamity-inc/warframe-riven-info's RivenParser.js
// (see Task 1 research notes) - fill in every stat code with its real weight,
// do not invent values.
static STAT_WEIGHTS: Lazy<HashMap<&'static str, f32>> = Lazy::new(|| {
    HashMap::from([
        ("CD", /* weight from reference */),
        ("CC", /* weight from reference */),
        ("MS", /* weight from reference */),
        // ... every stat code covered by STAT_TO_PRICER in rivenOcrI18n.js, so
        // no stat this app already recognizes falls through ungraded ...
    ])
});
```

Cross-check this list's stat codes against the full `STAT_TO_PRICER` map already in `src/lib/rivenOcrI18n.js` (lines 11-48, from earlier work this session) — every stat code recognized there needs a weight here, or grading will silently under-score rivens with an unweighted stat.

- [ ] **Step 2: Implement the per-stat normalization + scoring function**

```rust
pub struct RivenStatRoll {
    pub stat_code: String,
    pub value: f32,
    pub is_negative: bool,
}

pub struct RivenGradeResult {
    pub grade: String,
    pub score: f32,
}

fn normalize_stat_roll(stat_code: &str, value: f32, disposition: f32) -> f32 {
    // Body from Task 1 Step 4's reference doc - the exact min/max-range +
    // disposition normalization formula, not invented here.
    unimplemented!()
}

pub fn grade_riven(weapon_name: &str, stats: &[RivenStatRoll], disposition: f32) -> RivenGradeResult {
    let mut score = 0.0f32;
    for stat in stats {
        let weight = STAT_WEIGHTS.get(stat.stat_code.as_str()).copied().unwrap_or(1.0);
        let normalized = normalize_stat_roll(&stat.stat_code, stat.value, disposition);
        let signed = if stat.is_negative { -normalized } else { normalized };
        score += signed * weight;
    }

    let grade = grade_from_score(score); // thresholds from Task 1 Step 4
    RivenGradeResult { grade, score }
}

fn grade_from_score(score: f32) -> String {
    // Thresholds from Task 1 Step 4's reference doc, not invented here.
    unimplemented!()
}
```

- [ ] **Step 3: Write the failing tests before filling in the `unimplemented!()` bodies**

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scores_a_max_roll_positive_stat_near_the_top_of_its_weighted_range() {
        let stats = vec![RivenStatRoll { stat_code: "MS".into(), value: /* known max-roll value for MS at disposition 1.0, from Step 1's reference */, is_negative: false }];
        let result = grade_riven("acceltra", &stats, 1.0);
        assert!(result.score > 0.0);
    }

    #[test]
    fn negative_stats_reduce_score() {
        let good = grade_riven("acceltra", &[RivenStatRoll { stat_code: "MS".into(), value: 100.0, is_negative: false }], 1.0);
        let with_curse = grade_riven("acceltra", &[
            RivenStatRoll { stat_code: "MS".into(), value: 100.0, is_negative: false },
            RivenStatRoll { stat_code: "REC".into(), value: 50.0, is_negative: true },
        ], 1.0);
        assert!(with_curse.score < good.score);
    }

    #[test]
    fn higher_disposition_yields_a_different_normalized_score_for_the_same_raw_roll() {
        let low_disp = grade_riven("weapon_a", &[RivenStatRoll { stat_code: "CD".into(), value: 50.0, is_negative: false }], 0.5);
        let high_disp = grade_riven("weapon_a", &[RivenStatRoll { stat_code: "CD".into(), value: 50.0, is_negative: false }], 1.5);
        assert_ne!(low_disp.score, high_disp.score);
    }
}
```

- [ ] **Step 4: Run the tests to verify they fail (compile error from `unimplemented!()`, or panic when run)**

Run: `cd src-tauri && cargo test riven_grading::tests`
Expected: FAIL (panics on `unimplemented!()`).

- [ ] **Step 5: Fill in `normalize_stat_roll` and `grade_from_score` from Task 1 Step 4's reference doc**

Replace both `unimplemented!()` bodies with the real formula/thresholds documented in Task 1.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd src-tauri && cargo test riven_grading::tests`
Expected: PASS. If disposition/normalization behavior doesn't match intuition (e.g. Step 3's disposition test), re-check Task 1 Step 1's reading of the reference formula rather than adjusting the test to fit a wrong implementation.

- [ ] **Step 7: Add `once_cell` to `Cargo.toml` if not already present**

```bash
grep once_cell src-tauri/Cargo.toml || cargo add once_cell --manifest-path src-tauri/Cargo.toml
```

- [ ] **Step 8: Register the module and commit**

```bash
git add src-tauri/src/riven_grading.rs src-tauri/src/main.rs src-tauri/Cargo.toml
git commit -m "Add formula-based riven stat grading (disposition-normalized, per calamity-inc/warframe-riven-info methodology)"
```

---

### Task 3: Wire real per-stat roll values through from the frontend

**Files:**
- Modify: `src-tauri/src/pricer.rs` (`RivenInput` struct, `estimate_full`)
- Modify: `src-tauri/src/main.rs` (Tauri command signatures)
- Modify: `src/screens/Rivens.jsx` (where `RivenInput`-shaped objects are built, ~lines 153-198)

**Interfaces:**
- Produces: `RivenInput` gains `stats: Vec<RivenStatRollInput>` where `RivenStatRollInput = {stat_code: String, value: f32, is_negative: bool}` and `disposition: f32` — replacing the previous plan's single `perfectness: f32` field, since the formula-based approach (unlike the lookup-table approach) needs each stat's actual rolled value, not a single pre-averaged perfectness number.

- [ ] **Step 1: Confirm where raw numeric stat roll values already exist in JS**

`src/lib/inventoryParser.js`'s `formatStat()` (~line 1962) builds each stat's *display* value — confirm it has access to (or can be modified to also expose) the raw numeric roll before formatting, since that's what `grade_riven` needs, not the formatted display string.

- [ ] **Step 2: Add `stats`/`disposition` to `RivenInput` in Rust**

```rust
// src-tauri/src/pricer.rs
pub struct RivenStatRollInput {
    pub stat_code: String,
    pub value: f32,
    pub is_negative: bool,
}

pub struct RivenInput {
    pub weapon_name: String,
    pub re_rolls: i32,
    pub positive1: Option<String>,
    pub positive2: Option<String>,
    pub positive3: Option<String>,
    pub negative: Option<String>,
    pub stats: Vec<RivenStatRollInput>, // NEW
    pub disposition: f32,               // NEW
}
```

- [ ] **Step 3: Pass real stat rolls from `Rivens.jsx`**

At the existing `RivenInput`-shaped object construction, add `stats` (mapped from the riven's raw per-stat roll values, per Step 1) and `disposition` (looked up per-weapon, per Task 1 Step 2's confirmed data source).

- [ ] **Step 4: Build check**

Run: `cd src-tauri && cargo check` and `pnpm exec vite build --mode production`.
Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/pricer.rs src/screens/Rivens.jsx
git commit -m "Thread real per-stat roll values and disposition through to RivenInput"
```

---

### Task 4: Swap `grade_from_cdf` for `riven_grading::grade_riven` in `estimate_full`

**Files:**
- Modify: `src-tauri/src/pricer.rs` (`fn estimate_full`, ~lines 276-330)

**Interfaces:**
- Consumes: `riven_grading::grade_riven` (Task 2), `RivenInput.stats`/`.disposition` (Task 3).
- Produces: `RivenFullEstimate.grade` now sourced from formula-based grading; every other `RivenFullEstimate` field unchanged.

- [ ] **Step 1: Write a regression test pinning today's non-grade `RivenFullEstimate` fields**

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
            stats: vec![
                RivenStatRollInput { stat_code: "MS".into(), value: 90.0, is_negative: false },
                RivenStatRollInput { stat_code: "CD".into(), value: 80.0, is_negative: false },
                RivenStatRollInput { stat_code: "IMP".into(), value: 40.0, is_negative: true },
            ],
            disposition: 1.0,
        };
        let result = estimate_full(&input).expect("should produce an estimate for a known weapon");
        assert!(result.cdf_percentile >= 0.0 && result.cdf_percentile <= 1.0);
        assert!(result.weapon_rank > 0);
    }
}
```

- [ ] **Step 2: Run the test to verify it passes against current (pre-swap) behavior**

Run: `cd src-tauri && cargo test estimate_full_grade_swap_tests`
Expected: PASS.

- [ ] **Step 3: Swap the grade source inside `estimate_full`**

```rust
// Before:
// let grade = grade_from_cdf(cdf);

// After:
let stat_rolls: Vec<crate::riven_grading::RivenStatRoll> = input.stats.iter()
    .map(|s| crate::riven_grading::RivenStatRoll { stat_code: s.stat_code.clone(), value: s.value, is_negative: s.is_negative })
    .collect();
let grade = crate::riven_grading::grade_riven(&input.weapon_name, &stat_rolls, input.disposition).grade;
```

- [ ] **Step 4: Re-run the regression test from Step 1**

Run: `cd src-tauri && cargo test estimate_full_grade_swap_tests`
Expected: PASS — confirms non-grade fields genuinely unchanged.

- [ ] **Step 5: Check `estimate_full_batch` propagates the same way**

Read `estimate_full_batch` (~line 332) — if it's a thin per-item wrapper around `estimate_full`, no separate change needed. If it duplicates logic, apply the same swap and add the equivalent test.

- [ ] **Step 6: Full crate test suite**

Run: `cd src-tauri && cargo test`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add src-tauri/src/pricer.rs
git commit -m "Swap riven grade source from ONNX price CDF to formula-based stat grading

Fixes #81"
```

---

### Task 5: Manual end-to-end verification and issue closeout

**Files:** none (verification only)

- [ ] **Step 1: Build and run**

```bash
cd /var/home/jedwards/kiedas-orbiter
NO_STRIP=1 pnpm tauri build --bundles appimage
```

- [ ] **Step 2: Live-check grading against known rivens**

Open the Rivens tab with real riven inventory. Check 2-3 rivens you have strong intuition about (a genuinely great roll, a mediocre one). Confirm grades feel right, and the ONNX price estimate text still displays unchanged.

- [ ] **Step 3: If grading feels systematically off, revisit Task 1's formula/weights before considering the lookup-table approach**

Per this plan's Global Constraints — only reconsider the rejected lookup-table architecture if formula-based grading demonstrably underperforms in practice, with specific examples, not preemptively.

- [ ] **Step 4: Close the issue**

```bash
gh issue close 81 --repo GoblinOfChaos/Kiedas-Orbiter --comment "Implemented per docs/superpowers/plans/2026-08-08-riven-stat-based-grading.md, using a formula-based disposition-normalized grader (modeled on calamity-inc/warframe-riven-info's methodology) rather than porting wfinfo-ng's curated good-combos lookup table - research found this is the more standard, lower-maintenance community approach. ONNX price estimate and all other RivenFullEstimate fields unchanged. Verified live against [N] known rivens."
```

---

## Self-Review

- **Spec coverage:** Issue #81's core ask (grade driven by riven stats, not market price; keep ONNX price display) is covered by the new architecture just as much as the original lookup-table plan would have been — the *source* of "stat-based" changed (formula vs. curated table) per research findings, but the deliverable is the same.
- **Placeholder scan:** `unimplemented!()` in Task 2 Step 2 is intentional and explicitly resolved in Step 5 using Task 1's research output — not a shipped placeholder. Stat-weight table values are marked "from reference" rather than invented, per the no-placeholders rule; the implementer must have Task 1's findings in hand before Task 2 Step 1 is actually fillable.
- **Type consistency:** `RivenStatRoll`/`RivenStatRollInput` names are distinguished deliberately (`Input` suffix on the Tauri-command-facing struct in `pricer.rs`, unsuffixed for the internal grading-module struct in `riven_grading.rs`) with an explicit mapping step in Task 4 Step 3 — flagged so the implementer doesn't accidentally conflate or forget the conversion.
