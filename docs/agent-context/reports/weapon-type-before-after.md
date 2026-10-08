# P70 weapon type buttons: before and after

The counts below are from the real preview inventory parsed through
`parseInventory`. They describe the Weapons tab before other active filters
such as Owned or Mastered are applied.

| Button | Before | After |
| --- | ---: | ---: |
| Primary | 196 | 196 |
| Secondary | 147 | 147 |
| Melee | 230 | 230 |
| Zaw | Not present | 37 |
| Kitgun | Not present | 6 |

Zaws moved from All-only to the Zaw button: Balla, Cyath, Dehtat, Dokrahm,
Ekwana Ii Jai, Ekwana Ii Ruhang, Ekwana Jai, Ekwana Jai Ii.

Kitguns moved from All-only to the Kitgun button: Catchmoon, Gaze,
Rattleguts, Sporelacer, Tombfinger, Vermisplicer.

The existing Primary, Secondary, and Melee predicates are unchanged. The
real-data regression test verifies that every other-equipment item is still
shown by All and matches none of the five type buttons; it intentionally
asserts that relationship rather than a profile-dependent count.
