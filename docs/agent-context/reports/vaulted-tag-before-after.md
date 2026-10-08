# P71 vaulted tag: before and after

## Proof method

The worktree index is read-only, so `git stash` and `git worktree add` could
not create their required lock/metadata files. A fresh disk-backed copy was
created under `$TMPDIR/vaulted-tag-proof-copy-22pC1A`, excluding `node_modules`,
tests, docs, scratchpad, and wiki data; the new P71 test was copied in and all
changed tracked source files were replaced from `HEAD` with `git archive`.

Against that baseline, `vaulted-tag.test.mjs` failed: the synthetic confirmed
vaulted relic had `vaulted === undefined`, and the real
`/Lotus/Types/Game/Projections/T1VoidProjectionABronze` past-date relic had no
tag. The proof copy was removed after this report was written.

## Tag counts

| State | Relics with tag | Items with tag |
| --- | ---: | ---: |
| Before | 0 | 0 |
| After | 727 | 387 |

Before had neither the `vaulted` model flag nor the
`acquisition_drawer.vaulted_check_wiki` UI key, so no drawer could show the
new tag. After counts come from the real-data P71 test; the Baro exception is
excluded from the past-date set before counting.

## Changed items and replaced-source examples

387 items changed from a source grid to the vaulted wiki prompt in
`AcquisitionDrawer`. The first eight real-data examples whose displayed
sources are replaced are:

- Spira Prime Pouch
- Vauban Prime Neuroptics
- Ash Prime
- Akstiletto Prime Link
- Fragor Prime Head
- Carrier Prime
- Vectis Prime Barrel
- Vauban Prime Systems

No unknown-vault source is tagged. Axi A2, A5, A8, M5, V8, and Neo O1 are
explicitly not vaulted: the Baro rule wins even where Axi A8 carries a past
`vaultedAt` value in the export.
