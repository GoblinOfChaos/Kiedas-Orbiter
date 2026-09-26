# Relic rewards adapter report

## Result

The relic slice now passes the completeness matrix: 108/108 refinement variants for the 27 DE relic names pass. The adapter emits the app's existing `ExportRewards` shape and attaches DE manifest icons without inventing reward data.

## Official-source ledger

- Rewards: official Digital Extremes `ExportRelicArcane_en.json`, downloaded from the PublicExport manifest recorded in `/home/jedwards/.cache/kiedas-de-export/provenance.json`. Each target variant has six inline `relicRewards` entries (`rewardName`, `rarity`, and `itemCount`). This is the authoritative source used by the adapter.
- `ExportRewards`: DE provides no corresponding `ExportRewards` asset in the cached official category set. The adapter creates a deterministic manifest key from each DE relic `uniqueName` and maps only those inline DE entries to `{ type, rarity, itemCount }` inside the established `[[...]]` shape.
- `DropsAll.json`: inspected in the Preview export, but it is mirror data and is not used for this merge. No mirror reward lookup is needed after the adapter creates `ExportRewards` entries.
- DE drop-table HTML/parser: the existing parser supports official droptable HTML, but no cached HTML snapshot was used for this change. The inline DE relic records already provide the complete six-item reward pool, so no second network source or inferred conversion was necessary.
- Images: official DE `ExportManifest.json` entries provide `textureLocation` paths and content hashes for all four refinement variants of all 27 names. The existing manifest image merge imports the paths; the relic merge now applies the matching icon path to each relic record.

## Changed behavior

- `scripts/de-export/adapters/relics-arcanes.mjs` derives official `era`, code `category`, and refinement `quality` from the DE display name/uniqueName, converts inline `relicRewards` into `ExportRewards`, and preserves only source fields.
- `scripts/de-export/apply-merges.mjs` merges/writes `ExportRewards.json` and applies official manifest icons to merged relics.
- `scripts/item-completeness.mjs` discovers existing relics missing the adapter output and checks relics through `getRelicCatalog()` rather than the owned-only inventory list. Refinement variants are grouped by their real catalog key.

## Verification

- `nice -n 19 node --check scripts/de-export/adapters/relics-arcanes.mjs` — pass.
- `nice -n 19 node --check scripts/de-export/apply-merges.mjs` — pass.
- `nice -n 19 node --check scripts/item-completeness.mjs` — pass.
- `nice -n 19 node scripts/de-export/apply-merges.mjs --data-dir /home/jedwards/.local/share/kiedas-orbiter-preview/data --cache-dir /home/jedwards/.cache/kiedas-de-export --out /tmp/relicrewards-merged` — pass; output included 4,299 reward manifests and 12,619 images.
- `nice -n 19 npm run check:completeness` — relic category pass: 108 PASS, 0 FAIL, 0 CANNOT. Overall command exits 1 because unrelated existing mod (4) and cosmetic (69) rows remain failing; the generated `docs/agent-reports/matrix.md` records them.
- A finite standalone real-data inspection confirmed every target name has 4 DE variants, 6 DE rewards per variant, 4/4 manifest image entries, and 4/4 adapted reward manifests.

## Open questions and risks

- Runtime/Tauri build and live UI rendering were not run, per task restrictions. The coordinator should refresh the Preview data and inspect one new relic in Relics and Relic Planner.
- The completeness command's overall exit remains red for unrelated mods/cosmetics work; relics are green.
- The adapter relies on DE's stable `Lith|Meso|Neo|Axi <letter><number> Relic` display-name form for catalog fields. Records outside that Prime-relic form remain unmodified for those derived fields and are not forced into the Prime catalog.

## Suggested follow-ups

- Have the coordinator rerun the matrix after integrating the worktree and perform the requested live Preview refresh.
- Address the separately reported mod/cosmetic completeness failures in their own adoption slices.
