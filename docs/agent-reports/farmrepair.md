# Farm repair report

## Before / after evidence

| Check | Before | After / status |
|---|---:|---|
| Recipe blueprint rows in requirements | 0 | 1 per unresolved recipe node |
| Narin component recipe source | omitted from inventory craftable list | supplemented from DE `ExportRecipes` |
| Nameless provenance place | `Unknown source` / `drops.wf` could rank | skipped from place index |
| Mission filter labels | raw `MT_*`, source kinds mixed in | resolved display names; cache/container rows have no mission type |
| Inspector resolved state | misleading generic empty text | explicit already-have message |
| Inspector unresolved state | same generic text | explicit no-recipe/no-drop message |
| SSR harness | absent | added; not executed under no-bundler restriction |

## Real-data status

The requested harness reads the real Preview export bundle through
`scripts/lib/real-data-harness.mjs` and reads an explicitly supplied inventory
copy without writing it. It asserts the three Narin blueprint rows, Zariman
place names, readable mission options, absence of `MT_`/unknown provenance
places, and the minimum-chance input. It was not run in this worktree because
executing its esbuild bundle is prohibited by the task's no-bundler rule.

## Remaining verification

Visual WebKitGTK rendering, selector keyboard interaction, and live user data
values remain unverified. No live Warframe API or warframe.market write was
performed.
