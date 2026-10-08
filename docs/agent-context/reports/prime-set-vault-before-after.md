# Prime Set vault-status before and after

Measured against the local real-data harness on 2026-10-07. States are derived only from the relic sources of each set's parts.

| State | Before | After |
| --- | ---: | ---: |
| Vaulted | 107 | 102 |
| Available | 59 | 13 |
| Unknown | 0 | 51 |

## Changed sets

- Vaulted to unknown (4): Titan Extractor Prime, Distilling Extractor Prime, Galariak Prime, Sagek Prime.
- Available to unknown (47; first 8): Nautilus Prime, Caliban Prime, Citrine Prime, Gyre Prime, Hydroid Prime, Ivara Prime, Lavos Prime, Nyx Prime.
- Vaulted to available (1): Equinox Prime.

The old implementation treated relics with `vaulted: null` as unvaulted through `!relic.vaulted`. The new implementation preserves unknown rather than placing it in either filter.
