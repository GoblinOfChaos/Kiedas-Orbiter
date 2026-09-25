# DE drop-table adoption report

## Source and normalized snapshot

The official source is `https://www.warframe.com/droptables`, already used by
`scripts/de-drop-tables/fetch.mjs`; its redirect allow-list accepts only
`warframe.com` and Digital Extremes' approved CDN host. The available real
normalized snapshot reported:

| Measure | Count |
| --- | ---: |
| DE rows | 52,914 |
| distinct places/sources | 4,811 |
| mission places | 441 |
| converted mission nodes | 441 |
| converted relic groups | 3,194 |
| converted enemy/mod locations | 7,373 |
| converted blueprint locations | 105 |

The Rust refresher keeps the snapshot under `data/export/de/DropTables.json`,
uses a 24-hour TTL, waits at least one second before the request, validates a
minimum row floor, validates chance bounds (while preserving DE's explicit
under-review zero rows), and rejects any new snapshot below 80% of the
previous row count, then writes atomically. Refresh errors are non-fatal.

## Parity

The finite parity command is:

```bash
nice -n 19 node scripts/de-drop-tables/parity.mjs <old-DropsAll.json> <new-DropTables.json>
```

It reports rows only in old, rows only in new, and every chance difference;
there is no silent chance normalization. A same-era old `DropsAll.json` was not
available in this worktree, and the environment could not resolve
`drops.warframestat.us` when attempting to obtain the fallback cross-check
(`curl: (6) Could not resolve host`). Therefore no old-vs-new difference count
is claimed here. The feature remains disabled.

## Chance-order gate

The converter output was checked with:

```bash
nice -n 19 node scripts/check-chance-order.mjs /tmp/de-dropsall-real.json
```

Result: 57 real item lookups, 574 mission rotation comparisons, and 0 order
violations. The default `DE_DROP_TABLES_ENABLED` constant remains `false` until
the parity report has reviewed a real old snapshot.

## Review summary

- Pass: official URL, non-fatal refresh, atomic cache write, TTL, request
  spacing, row floor, previous-snapshot count guard, pure runtime conversion,
  fallback source, and chance-order check.
- Blocked: parity review and default-source cutover, because the old snapshot
  could not be obtained in this network-restricted environment.
- Risk: DE sections without a direct legacy `DropsAll` category remain in the
  normalized snapshot and are not guessed into another legacy category.
