# Independent Export Plus Generator Pipeline

## Handoff purpose

Build a Kiedas-owned data pipeline based on Calamity's `warframe-public-export-plus-gen` generator. The pipeline must generate Kiedas' Warframe data from fresh source inputs under our control instead of depending on Calamity's generated export repository being updated on our schedule.

This is a data-pipeline project. It must not change application behavior until the generated data has been independently produced, compared, validated, and approved.

## Decision and permission context

Use Calamity's repositories as the implementation starting point. The current `warframe-public-export-plus` repository publishes an MIT license and describes itself as a data source containing information missing from DE's Public Export: [repository](https://github.com/calamity-inc/warframe-public-export-plus).

Calamity also gave explicit permission in [issue #91](https://github.com/calamity-inc/warframe-public-export-plus/issues/91) to redistribute the contents of that repository and use them commercially. Preserve the required license/attribution notices when adapting or redistributing their code or generated material. This plan assumes that permission and the repository license remain available; implementation should record the exact upstream commit and license text used.

Digital Extremes data and Warframe assets remain subject to Digital Extremes' terms and content policy. Keep DE attribution and the existing Kiedas disclaimer; do not imply that Kiedas is affiliated with or endorsed by DE.

## Problem

Calamity's generated export has sometimes gone many months without an update. Kiedas needs a pipeline that can refresh promptly when DE changes the Public Export or the installed game data.

The generator is not a complete crawler. It transforms several input trees:

```text
DE Public Export manifests --------------------┐
local Warframe package extraction -------------┤
local DE language-bin extraction --------------┤
wiki/manual supplemental data -----------------┤
small third-party or local supplements --------┘
                         |
                         v
             adapted export-plus generator
                         |
                         v
                 Kiedas data artifacts
```

## Scope

### In scope

- Forking or vendoring the generator at a pinned upstream commit.
- Replacing hard-coded checkout paths with a configuration file or environment variables.
- Downloading DE Public Export manifests directly.
- Extracting package and language data from a locally installed copy of Warframe where required.
- Maintaining supplemental inputs with explicit provenance.
- Generating the export files Kiedas consumes.
- Automated freshness checks, validation, diffing, and publication of successful output.
- Recording source URLs, timestamps, hashes, upstream commits, and generator version for every generated dataset.

### Out of scope for the first implementation

- Rewriting the entire generator from scratch.
- Reproducing every Calamity output before Kiedas' required outputs work.
- Changing frontend or Rust consumers during the initial pipeline bring-up.
- Treating a wiki/manual field as official DE data without recording its provenance.
- Silently falling back to a stale generated dataset after a failed refresh.

## Upstream material to start from

- Generator: [`warframe-public-export-plus-gen`](https://github.com/calamity-inc/warframe-public-export-plus-gen)
- Main pipeline: [`index.pluto`](https://github.com/calamity-inc/warframe-public-export-plus-gen/blob/master/index.pluto)
- Package extraction example: [`extras/datafiles/_extract.bat`](https://github.com/calamity-inc/warframe-public-export-plus-gen/blob/master/extras/datafiles/_extract.bat)
- Calamity generated output and schema reference: [`warframe-public-export-plus`](https://github.com/calamity-inc/warframe-public-export-plus)
- Official DE Public Export: [`content.warframe.com/PublicExport/`](https://content.warframe.com/PublicExport/)
- Official DE WorldState, where live data is needed: [`worldState.php`](https://api.warframe.com/cdn/worldState.php)
- Official Warframe Wiki: [`wiki.warframe.com`](https://wiki.warframe.com/)

## Source and provenance policy

Every input must be classified in a manifest before it can affect published output.

| Source class | Examples | Policy |
|---|---|---|
| `official-de-public-export` | `ExportWeapons_*.json`, `ExportRecipes.json` | Download directly from DE; record URL, retrieval time, hash, and manifest version. |
| `official-de-game-data` | package files and language data extracted from a local Warframe installation | Extract locally after a game update; record game build/cache identity and extraction tool version. |
| `official-warframe-wiki` | introduction dates, vaulted dates, manually documented mission fields | Fetch or maintain from `wiki.warframe.com`; record page/revision or retrieval metadata. |
| `manual-research` | corrections and missing mappings not present in official sources | Keep in small reviewable files with an explanation and evidence link. |
| `third-party` | palettes, external glyph mappings, helper exclusions | Isolate, license-check, and include only if Kiedas needs the resulting field. |
| `derived-local` | normalization, deduplication, field mapping | Treat as our code; add regression tests and document the transformation. |

No generated file should be described as purely DE-sourced if it contains wiki, manual, or third-party additions.

## Required implementation phases

### Phase 1: inventory and reproducibility

1. Clone or vendor the generator at a pinned commit.
2. Record the exact upstream commit and license files.
3. Inventory every `io.contents`, `dofile`, external executable, and relative path in `index.pluto` and `extras/`.
4. Produce a source manifest showing which generated output fields each input affects.
5. Create a clean, isolated workspace outside the application source tree for raw inputs, extracted inputs, generator checkout, and output.

Acceptance criteria:

- Another session can identify every required input without relying on undocumented paths.
- A second run with identical inputs produces byte-equivalent output or a documented deterministic difference.
- No application files are changed.

### Phase 2: direct DE Public Export acquisition

1. Implement a downloader for the official DE Public Export manifests.
2. Store raw downloads immutably by retrieval timestamp or content hash.
3. Validate expected manifest names and JSON structure before replacing the active input set.
4. Make the generator's `PE_BASE` configurable instead of assuming `../warframe-public-export`.
5. Add a manifest diff report so DE changes are visible before publication.

Acceptance criteria:

- A new DE manifest can be acquired without cloning or downloading Calamity's generated data.
- A failed or malformed download leaves the previous known-good active input set untouched.
- The report identifies added, removed, and changed manifests.

### Phase 3: local package and language extraction

1. Determine the exact package paths required by the generator.
2. Extract those paths from a local Warframe installation/cache.
3. Replace Windows-only path assumptions with a portable invocation layer, or document a separate extraction step for each supported host.
4. Make the language-bin and package-bin roots configurable.
5. Record the Warframe build, cache location, extractor version, and extraction timestamp.

Do not publish package-derived output if extraction was performed against an unknown or mixed game build.

Acceptance criteria:

- The pipeline can rebuild package-dependent outputs from a local game installation.
- Missing package files fail loudly with the exact required paths.
- The active extraction build is visible in the dataset metadata.

### Phase 4: isolate and replace supplemental inputs

Review each current supplement individually. Initially preserve behavior, but move each input into an owned, documented supplement directory.

Priority inputs:

- `extras/ExportUpgrades-missing.json`: affects `ExportUpgrades.json` and therefore Kiedas Mods/Rivens workflows.
- `extras/wiki/Mods.lua`: adds mod metadata and introduction information.
- `extras/wiki/Weapons/*.lua`: adds weapon metadata and introduction information.
- `extras/wiki/Warframes.lua`: adds Warframe metadata and introduction information.
- `extras/Missions.lua`: affects region metadata and mission information.
- `extras/DropTables.lua`: affects region rewards and acquisition data.
- `extras/wiki/Void.lua` and `extras/wiki/Version.lua`: affect relic/arcane introduction and vault metadata.

Lower-priority or optional inputs:

- `extras/palettes.json`: only retain if Kiedas consumes the resulting `legacyColours` data.
- `extras/forum-glyphs-ok.cat.txt`: only retain if Kiedas consumes `ExportImages.forumName`.
- `exclude-mods.json`: replace with an owned, documented exclusion list or remove if it is not needed.

Each retained supplement must have a header or adjacent metadata file stating source, license, retrieval date, and what output fields it changes.

### Phase 5: Kiedas-targeted generation

Begin with the outputs currently relevant to Kiedas:

- `ExportUpgrades.json`
- `ExportWeapons.json`
- `ExportWarframes.json`
- `ExportRecipes.json`
- `ExportResources.json`
- `ExportRegions.json`
- `ExportRelics.json`
- `ExportArcanes.json`
- `ExportFlavour.json`
- `ExportImages.json` if required by the asset pipeline

Generate the full upstream output only after the targeted set is reproducible. Keep raw inputs and generated outputs separate. Do not edit generated JSON manually.

### Phase 6: freshness automation

Create a scheduled refresh job that:

1. Checks DE Public Export manifests.
2. Detects a local Warframe game/cache build change.
3. Acquires or extracts new inputs into a new staging directory.
4. Runs the generator with bounded resource usage.
5. Runs validation and output diffs.
6. Publishes only a fully validated dataset.
7. Retains the prior successful dataset if any stage fails.

The first refresh schedule may be daily. A game-build change should also trigger a refresh. This removes dependence on Calamity's update cadence while still allowing their generator improvements to be merged deliberately.

## Validation requirements

Before any generated data is consumed by Kiedas, validate:

- JSON parsing for every published file.
- Expected top-level shapes and required fields.
- Unique-key and duplicate checks.
- Cross-file references such as recipe ingredients, weapon/mod identifiers, reward manifests, and localization tags.
- No unresolved language tags for the supported language set.
- No output generated from mixed or unknown game builds.
- Stable output ordering and deterministic regeneration.
- Count and schema diffs against the previous successful generation.
- Targeted Kiedas fixture checks for Mods, Rivens, Foundry, Relics, Mastery, and cosmetic catalogs.

Validation must fail closed. A warning may be recorded for a known, reviewed exception; an unexplained missing or malformed source must block publication.

## Provenance and attribution in the application

Add a generated metadata file containing at least:

```json
{
  "generatorCommit": "...",
  "generatedAt": "...",
  "publicExportManifestHashes": {},
  "warframeBuild": "...",
  "extractorVersion": "...",
  "supplementVersions": {},
  "sources": [
    "Digital Extremes Public Export",
    "Official Warframe Wiki",
    "Calamity warframe-public-export-plus-gen"
  ]
}
```

Expose attribution in the repository and, where practical, in Kiedas' About or data-source information. Keep Calamity's license notice with adapted generator code and generated material where required by that license.

## Handoff deliverables

The implementation session should eventually produce:

1. A pinned generator fork or vendored generator directory.
2. A configurable source layout.
3. Direct DE Public Export acquisition.
4. Local package/language extraction or a documented replacement for each required input.
5. Owned supplemental data with provenance metadata.
6. Deterministic generation and validation commands.
7. A refresh job or script with safe staging and rollback behavior.
8. A generated-data source manifest and attribution document.
9. A comparison report against one Calamity-generated snapshot.
10. A separate approval checkpoint before changing Kiedas' runtime data source.

## Important implementation constraints

- Follow the repository `AGENTS.md` rules.
- Preserve the dirty worktree; do not reset or overwrite unrelated files.
- Do not compile or run broad tests during pipeline design without explicit approval.
- Any build or extraction command must be resource-bounded and must not freeze the desktop.
- Use official DE sources and `wiki.warframe.com`; do not substitute Fandom or undocumented data sources.
- Do not claim that a field is DE-originated when it comes from research, wiki data, or a third-party supplement.
- Do not modify Kiedas application code until generated-data validation is complete and separately approved.

## Definition of done

The work is complete when Kiedas can receive a newly generated, validated dataset from a DE update without waiting for Calamity to publish a new export snapshot, while preserving the useful transformations in Calamity's generator and maintaining clear attribution and provenance for every non-DE addition.
