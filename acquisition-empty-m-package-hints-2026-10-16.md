# Empty-M package → wiki hints (2026-10-16)

Research hints only. Package fields are NOT acquisition data; nothing written to the xlsx, `acquisition-sections.json`, or the app. Column C untouched.

Sidecar: `/tmp/wiki-acq-search/empty-m-package-wiki-hints.json` (script `/tmp/gp/pkghints.py`).

## Counts

- Rows with empty column M: **630**
- Package hit (item file and/or StoreItems twin): **630**; miss: **0** (item path `Lotus/X.json` and twin `Lotus/StoreItems/X.json` both resolve by plain path mirroring)
- `AlwaysAvailable: 1`: **66**; `MarketMode`: MM_HIDDEN 439, MM_VISIBLE 43, absent 148
- Rows with ≥1 suggested wiki title: **618**; none: **12**
- Rows where a suggested title exists in local `wiki_store`: **168**; none exist locally: **462**
- Column M filled: **0** (packages give no acquisition text; no new wiki evidence gathered here)

## By category (empty M)

- ExportResources: 449 (no local wiki page for a suggested title: 363)
- ExportCustoms: 127 (no local wiki page for a suggested title: 61)
- ExportRelics: 24 (no local wiki page for a suggested title: 24)
- ExportGear: 15 (no local wiki page for a suggested title: 4)
- ExportWeapons: 6 (no local wiki page for a suggested title: 6)
- ExportUpgrades: 5 (no local wiki page for a suggested title: 0)
- ExportSentinels: 4 (no local wiki page for a suggested title: 4)

## Findings

- `Lotus/Language/` in the dump has only `LockedForAdd.json`, `Subtitles/LockedForAdd.json` and Unihan variants. No string tables, so `packageDisplayName` is not resolvable; `localizeTag` key is recorded instead.
- Store twin pattern: `/Lotus/X` ↔ `/Lotus/StoreItems/X` (same relative path). Twin carries `ShowInMarket`, `Giftable`, `DateAddedToManifest`.
- `MM_HIDDEN` + `AlwaysAvailable` is common for Operator brows and similar customs, so it does not imply a purchasable source. Do not infer acquisition from it.
- Helminth secretions flagged (leave M empty): 7; Operator brows flagged (price only): 18.
- Dual-title rows: no resolution invented; hints list all titles as given.

## Wiki follow-up needed

- 630 rows still need wiki evidence before M can be filled. Start with the 43 `MM_VISIBLE` rows (Market-sold items likely have a wiki Market price) and the 66 `AlwaysAvailable` rows.
- 12 rows have no suggested title at all: look up by game name on wiki.warframe.com.
- Resources (`ExportResources`, 449 rows) are mostly MM_HIDDEN with no local wiki page; need drop-source pages checked one by one.
