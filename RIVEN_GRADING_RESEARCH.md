# Riven grading research (2026-07-25)

## Why this audit was needed

`riven_good_rolls.json` contains 416 weapon entries derived from the historical
44bananas/Xennethkeisere community spreadsheet. It is useful seed data, but it
must not be presented as timeless or definitive: weapon variants, Incarnons,
new mechanics, balance changes, and the player’s actual build can change which
stats are desirable.

“Grade” also means two different things that should not be conflated:

1. **Roll quality/perfectness** — where each numeric stat lies in its legal
   0.9–1.1 roll range. This is objective math.
2. **Build desirability** — whether those stats are useful for a particular
   weapon variant, build, target, and player goal. This is contextual.

## Sources inspected

### calamity-inc/warframe-riven-info

- Repository: <https://github.com/calamity-inc/warframe-riven-info>
- Latest inspected commit: 2025-06-01.
- Strength: reverse-engineered fingerprint parsing, stat-value formulas,
  disposition/attenuation math, and numeric roll grades.
- Its `floatToGrade()` grades numeric roll position (S begins at 97.5%); it does
  **not** determine whether Critical Chance, Toxin, etc. are good for a weapon.
- No license was found in the inspected repository, so it remains a behavioral
  reference unless permission/licensing is clarified.

### calamity-inc/browse.wf Riven calculator

- Calculator: <https://browse.wf/rivencalc>; source:
  <https://github.com/calamity-inc/browse.wf>.
- Latest inspected source commit: 2026-07-21. The calculator directly loads
  `RivenParser.js` from `calamity-inc/warframe-riven-info` and combines it with
  current `warframe-public-export-plus` upgrade/compatibility metadata.
- It converts displayed buff and curse values back to their normalized legal
  roll positions, then uses the calamity parser's letter-grade conversion. This
  makes it a useful live verifier for objective numeric roll perfectness.
- Like the underlying parser, it does not decide whether a stat combination is
  desirable for a weapon or build. It therefore supports the objective grading
  layer below, not a universal KEEP/REROLL verdict.

### ruali-dev/Riven-Analyst

- Repository: <https://github.com/ruali-dev/Riven-Analyst>
- Latest inspected commit: 2026-07-23; Apache-2.0.
- Uses current WFCD-derived weapon/disposition data, theoretical ranges,
  reviewed knowledge, weapon mechanics, and optional same-condition build
  calculations.
- Its quick verdict is made by an AI agent from evidence, not by a deterministic
  local grading function. The README currently describes mainland-China/Tencent
  server support, and the project explicitly warns that its mechanics knowledge
  and recommendations may be incomplete.
- Useful architectural lesson: treat current weapon/variant facts and explicit
  build calculations as evidence; do not turn one generic stat list into a
  universal verdict.

### munir-a-khan/rivenforge

- Repository: <https://github.com/munir-a-khan/rivenforge>
- Latest inspected commit: 2026-07-18.
- Strong OCR ideas: anchor the new card relative to `CONFIRM`, decode positive
  stats from the deterministic generated Riven name, OCR only values/negative,
  require multiple agreeing reads, and reject physically impossible reads.
- Strong decision idea: versioned, user-editable profiles with required/OR
  positive groups and safe/rejected/required negatives; incomplete OCR yields
  `REVIEW`, never an automatic keep/reroll verdict.
- Its advisory score still uses a tier-list spreadsheet for 55% of the score,
  plus Warframe.Market pricing (30%) and lexical TF-IDF similarity (15%). The
  bundled index has roughly the same weapon count/raw stat strings as this
  project’s historical dataset, so it does not solve spreadsheet staleness.
- The repository says all rights are reserved. Do not copy its code or bundled
  data. The general ideas above can be independently implemented.

### Current data/market sources

- WFCD `warframe-items`: <https://github.com/WFCD/warframe-items> — actively
  generated game data and the preferred source for weapon/variant stats and
  current disposition, but not a source of subjective “best roll” verdicts.
- Warframe.Market auctions can provide current demand/price evidence. Price must
  remain a separate market signal: expensive does not necessarily mean strong
  in a build, and sparse/manipulated listings should not decide KEEP/REROLL.
- Morrow Shore’s current Riven Appraiser advertises current-meta evaluation and
  OCR, but no inspectable source was found; it cannot be the foundation of a
  reproducible local grader.

### Overframe.gg

- Site: <https://overframe.gg/>
- No public source repository or documented standalone Riven grading algorithm
  was found. The inspected site is proprietary/all-rights-reserved.
- Overframe’s useful Riven behavior is **build simulation**, not a universal
  Great/Good/Bad verdict: a user adds a custom Riven to a concrete weapon build
  and compares resulting weapon outputs such as average hit, burst DPS, and
  sustained DPS. Its item pages also expose the weapon variant’s disposition.
- Community build votes and “popular mods” can help locate current candidate
  builds, but votes are not proof that a build is mechanically correct or
  current. Conditional effects and mechanics outside the calculator’s model can
  change the real result.
- Recommended use here: an optional same-condition counterfactual—compare the
  existing build against replacing one mod with the Riven, report the modeled
  delta and assumptions, and never turn that one modeled metric into the global
  Riven grade. This supports the contextual build-analysis layer recommended
  below; it does not replace deterministic profiles or roll perfectness.

### AlecaFrame 2.6.90 Riven OCR pipeline

- Official docs: <https://docs.alecaframe.com/overlays/riven-reroll> and
  <https://docs.alecaframe.com/faq>. Official Overwolf package inspected:
  extension `afmcagbpgggkpdkokjhjkllpegnadmkignlonpjm`, version 2.6.90,
  distributed as a readable OPK from Overwolf's own install manifest.
- AlecaFrame is not open source, but its FAQ explicitly says the installed C#
  assemblies are unobfuscated with debug symbols and its HTML/CSS/JS is readable.
  Conclusions here come from those officially distributed files, not UI guesses.
- Detection is event driven. Overwolf forwards Warframe
  `match_info.highlighted` data to `ItemJustHighlighted`; the native client also
  recognizes EE.log/UI signatures including `OmegaRerollSelection.lua: Diorama
  setup`, cycle-confirm dialog text, and explicit selected/rerolled/cycle-complete/
  closed states. It does not continuously OCR the entire screen to discover the
  reroll UI.
- Once triggered, the native pipeline takes a screenshot, makes a resolution/
  scaling-aware rough Riven crop, performs edge detection for a fine card crop,
  retries edge failure after a few milliseconds, and falls back to the rough crop
  on its last attempt. It separately handles all-dark screenshots and background-
  game capture delays.
- OCR itself is remote: the cropped bitmap is uploaded to AlecaFrame's
  `/new/ocr/single` service. Therefore its recognition model/implementation is not
  present in the client package and cannot be reproduced exactly from public
  client code. This project must keep OCR local rather than depend on that private
  service.
- Parsing is heavily domain constrained after OCR: generated Riven names recover
  attributes; raw OCR attributes are matched back to name-derived attributes;
  impossible attribute counts are rejected; sign inversions are corrected when
  plausible; only rank 0 or rank 8 is accepted; and weapon/type data must resolve.
- Old/new identity is stateful, not inferred anew from physical card position on
  every frame. The frontend has durable `rivenLeft` and `rivenRight` state and is
  refreshed by native `onRivenOverlayChange` events. Official behavior keeps the
  old/current roll left and the new offer right.
- The overlay is a full-game-size transparent Overwolf window at `(0,0)`, resized
  to the game's logical width/height with automatic DPI handling. Its panels are
  laid out in that coordinate space; it is not a small draggable corner window.
- Each side displays weapon/name, overall grade, per-stat letter grade and
  perfectness bar (`rawRandomValue`), similar market Rivens, and good/bad attribute
  guidance. The frontend can retry the last OCR explicitly.

Implication for wfinfo-ng: use reliable EE.log state transitions as the primary
reroll lifecycle trigger, take one/few focused captures per transition, keep
current/new identities in a state machine, fine-crop by card edges with rough-crop
fallback, then run local Tesseract plus generated-name/physical validation. Retain
slow visual polling only as a fallback for missing log events.

## Recommended architecture for wfinfo-ng

1. Keep calamity-style fingerprint decoding and per-stat roll perfectness as an
   objective, separately displayed measurement.
2. Replace the single spreadsheet verdict with versioned per-weapon profiles:
   required/alternative positive groups, safe/rejected negatives, weapon
   variant, use case, source, review date, and confidence.
3. Treat the current 416-entry file as **historical seed profiles**. Label them
   with provenance/date and return `REVIEW` for missing or stale profiles rather
   than pretending “Not in database” or a confident grade is authoritative.
4. Refresh objective weapon/disposition data from WFCD. Never overwrite a
   historical disposition when evaluating a historical screenshot.
5. Improve reroll OCR independently using generated-name decoding, a
   `CONFIRM`-anchored crop, physical limits (2–3 positives, at most 1 negative),
   and consensus across repeated frames.
6. Separate output into:
   - numeric roll quality per stat;
   - deterministic profile match with an explanation trace;
   - optional build-context analysis;
   - optional market value signal.
7. Make player-editable profiles authoritative for automatic KEEP/REROLL. A
   community/default recommendation should be advisory and identify its source
   and review date.

This avoids replacing one opaque universal grade with another and gives the
overlay a safe failure mode when OCR or current weapon knowledge is incomplete.
