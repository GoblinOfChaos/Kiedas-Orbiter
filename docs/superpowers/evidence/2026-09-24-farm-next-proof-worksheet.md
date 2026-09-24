# Farm-next hand-check worksheet

1. Targets: Atlas Prime Systems, Ash Prime Chassis, and direct-acquisition Conclave-only Blind Shot; one each.
2. Target identity check: each printed id, name, and itemType comes from one target record; Atlas/Ash are no longer swapped.
3. Atlas Systems edges: Argon Crystal 2, Gallium 4, Polymer Bundle 1200, Alloy Plate 3200.
4. Ash Chassis edges: Gallium 3, Nanospores 1000, Rubedo 400.
5. Shared-resource check: Gallium is shared; 4 Atlas Systems + 3 Ash Chassis = 7 required.
6. Gallium ledger arithmetic: 7 required; 1326 owned; max(0, 7 - 1326) = 0 still needed; Used by Ash 3 and Atlas 4.
7. Argon Crystal arithmetic: 2 required; 0 owned; still needed = 2.
8. Blind Shot arithmetic: direct acquisition, 1 required; owned count is 0 because no inventory record was invented; still needed = 1.
9. Conclave check: parsed DE tables have 104 items whose positive-chance sources are Conclave-only; Blind Shot is shown with `[PvP]` and a Conclave-only reason.
10. Ranking check: the default ranking now puts the Conclave places first because they cover Argon Crystal and Blind Shot (coverage 2), with `[PvP]` and the Conclave-only reason; the dedicated Conclave ranking agrees.
11. Compact inputs: five primary files have individual SHA-256 lines; the 209-file wiki JSON directory has one combined hash; `--verbose-inputs` expands it.
12. Audit counts: enemies 898/1020 with location; planets 713/1007 matched; missions 55/624 matched. No fuzzy joins were added.
