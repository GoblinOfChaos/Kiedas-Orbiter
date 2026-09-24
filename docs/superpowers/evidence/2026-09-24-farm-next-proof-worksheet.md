# Farm-next hand-check worksheet

1. Targets: Atlas Prime Systems, Ash Prime Chassis, and direct-acquisition Conclave-only Blind Shot; one each.
2. Target identity check: each printed id, name, and itemType comes from one target record; Atlas/Ash are no longer swapped.
3. Atlas Systems edges: Argon Crystal 2, Gallium 4, Polymer Bundle 1200, Alloy Plate 3200.
4. Ash Chassis edges: Gallium 3, Nanospores 1000, Rubedo 400.
5. Shared-resource check: Gallium is shared; 4 Atlas Systems + 3 Ash Chassis = 7 required.
6. Gallium ledger arithmetic: 7 required; 1326 owned; max(0, 7 - 1326) = 0 still needed; Used by Ash 3 and Atlas 4.
7. Argon Crystal arithmetic: 2 required; 0 owned; still needed = 2.
8. Blind Shot arithmetic: direct acquisition, 1 required; owned count is 0 because no inventory record was invented; still needed = 1.
9. Conclave check (coordinator note: the count of 104 comes from the agent's separate scan, NOT from the proof's raw output; the proof itself shows only Blind Shot): parsed DE tables have 104 items whose positive-chance sources are Conclave-only; Blind Shot is shown with `[PvP]` and a Conclave-only reason.
10. Ranking check: the default ranking now puts the Conclave places first because they cover Argon Crystal and Blind Shot (coverage 2), with `[PvP]` and the Conclave-only reason; the dedicated Conclave ranking agrees.
11. Compact inputs: five primary files have individual SHA-256 lines; the 209-file wiki JSON directory has one combined hash; `--verbose-inputs` expands it.
12. Audit counts: enemies 898/1020 with location; planets 713/1007 matched; missions 55/624 matched. No fuzzy joins were added.
13. Planet smoke (coordinator note: verified by the unit test on a fixture and the agent's ad-hoc run; the raw proof output has no Neurodes planet line because no target needs Neurodes; not independently reproduced in the proof run): Neurodes expands to Earth, Lua, Eris, and Deimos as chance-less planet sources; the planets tab excludes them when a minimum chance is set and reports the exclusion count.
14. Cached DE by-drop cross-check: resource/mod/blueprint byDropOnly and byAvatarOnly are all 0; no vendor place is inferred from a by-item table.

15. Coordinator re-ran the proof on the real inputs after the last fix round (the agent could not read the inventory in that round); `2026-09-24-farm-next-proof.txt` is that raw stdout. Known cosmetic oddity: the 'Conclave-only items' line in the dedicated Conclave section prints 'none' while the main section prints 'Blind Shot'.
