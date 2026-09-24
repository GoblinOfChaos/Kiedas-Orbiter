# Direct DE Public Export compatibility ledger

Audit run: 2026-09-23 UTC. This round compares the cached DE Public Export
against the real Preview runtime directory
/home/jedwards/.local/share/kiedas-orbiter-preview/data/export. The
machine-readable summary is COMPAT-LEDGER.json.

## Severity-ranked findings

| Severity | Category | DE records | App records | Difference |
| --- | --- | ---: | ---: | --- |
| Critical | ExportFusionBundles -> ExportBundles | 51 | 1,155 | Different namespaces; not a safe rename |
| Critical | ExportKeys | 49 | 574 | 3 DE-only Tau Prologue keys; 528 app-only quest-stage keys |
| Critical | ExportRegions | 269 | 354 | 85 app-only nodes; fields show semantic expansion |
| Warning | ExportCustoms | 4,832 | 4,722 | 113 DE-only, 3 app-only |
| Warning | ExportRelicArcane -> ExportRelics | 3,369 | 3,089 | 280 DE-only; schema requires adapter |
| Warning | ExportWarframes | 127 | 125 | Citrine Prime and Narin are DE-only |
| Warning | ExportWeapons | 841 | 843 | 4 DE-only, 8 app-only; DE has 839 unique keys |
| Warning | ExportResources / Flavour | 3,545 / 2,681 | 3,467 / 2,579 | 80 / 109 DE-only |
| Warning | Recipes / Upgrades / Sentinels / Gear | 1,885 / 1,603 / 34 / 180 | 2,000 / 1,601 / 38 / 179 | Review JSON counts |
| Info | Drones / SortieRewards / Manifest | 6 / 17 / 20,136 | no counterpart | Manual review only |

The exact named Warframe and weapon differences are in the JSON. Notable
DE-only Customs include Duelist, Citrine Prime, Qorvex Deluxe, Mesa Heirloom,
Jade, and newer Signa families; the three app-only Customs are the Horse
helmet, saddle, and tail drapery. Notable DE-only relic records are the
Sevagoth/Hydroid, Protea/Ivara, and Citrine Prime vault projection families.
The full 113/280 lists require preserving comparator output rather than
truncating this human-readable ledger.

Narin is definitively present in DE as
/Lotus/Powersuits/Duelist/Duelist and absent from the Preview baseline.
Citrine Prime is also DE-only in this comparison.

## Field mapping

Three first matching records per comparable category were inspected. Direct
identity fields (uniqueName, name, description, codexSecret, and
category-specific stats) match where present. The app mirror adds normalized
or presentation fields such as icon, introducedAt, platinumCost, tradable,
variantType, and compatibility metadata. DE-only fields needing an adapter
include levelStats on Upgrades, secretIngredients on Recipes, and relicRewards
on relics. Relics therefore require a real field mapping to
rewardManifest/era/quality; FusionBundles is not equivalent to the broader
app ExportBundles. No derived fields were claimed.

## WFCD comparison

The bundled src-tauri/data/assets/wfcd/wfcd-combined.json contains 121
Warframes and 640 weapons across Primary (195), Secondary (148), Melee
(269), Arch-Gun (20), and Arch-Melee (8). These are supplemental catalog
counts, not proof that a DE export record is absent from the app; the app
uses the WFCD weapon gap-fill files separately.

## Source/runtime boundaries

The comparator used cached DE assets from /home/jedwards/.cache/kiedas-de-export
and did not download anything in this round. The baseline is read-only. The
Preview source reads EXPORT_FILES through check_exports and assembles them in
load_all_exports in src-tauri/src/main.rs; it does not read the prototype
cache.
