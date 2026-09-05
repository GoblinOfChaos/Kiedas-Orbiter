# Kieda's Orbiter Live Session Runbook

## Purpose and boundaries

This runbook covers checks that cannot honestly pass from source review or simulated events alone. The operator controls Warframe at all times. The auditor controls only the frozen Kieda's Orbiter audit build and evidence capture, and only after an explicit `ready` response.

The audited Linux AppImage SHA-256 is:

`e4e2fa5f3e01a111b32cf3cbe116cf513e4e5799719f423de689bfc326be4ea4`

The session must not create, modify, or delete Warframe.Market orders; install an update; alter the installed application; or write to the primary Kieda's Orbiter profile. A Riven reroll spends account resources and is therefore optional and requires a separate explicit confirmation immediately before the action.

## Control handshake

1. The operator may play normally while background audit work runs. No audit window is opened or focused during that period.
2. The auditor says exactly what window will be opened and asks whether the desktop is free.
3. The operator replies `ready` only after reaching a safe place to pause or switch windows.
4. The auditor starts a session ID, records the wall-clock time, confirms the frozen artifact hash and isolated profile, and captures a baseline process/window snapshot.
5. The auditor gives one numbered in-game action. The operator performs only that action and replies `done` with any visible discrepancy.
6. The auditor captures the resulting app state, timestamps, relevant logs, process state, and window geometry, then gives the next action.
7. Either party may say `pause`. The auditor immediately stops UI input and leaves the game under operator control.

Screenshots are limited to the app/overlay evidence needed for the check. Any screenshot that could contain chat, account identifiers, friends, or unrelated desktop content is cropped or redacted before it is indexed in the report.

## Before the coordinated session

The operator should have available:

- Warframe running in a display mode that permits the overlay to appear (borderless windowed is preferred for the first pass).
- At least one relic for any currently available Void Fissure.
- If an endless fissure is available, enough time for two reward cycles; otherwise that branch remains Blocked until one is available.
- One Riven that can safely be opened in the Mod station for OCR. No reroll is required unless separately authorized.
- Notifications enabled at the operating-system level if notification delivery is to be validated.

No specific mission should be started before the auditor asks for it; baseline attach/detach evidence must be recorded first.

## Evidence captured for each action

Each action receives a stable ID such as `LIVE-FISSURE-004` and records:

- Session ID and local/UTC timestamp.
- Operator instruction and operator completion marker.
- Expected transition and actual transition.
- Frozen artifact hash and isolated-profile identifier.
- App, detector, helper, and Warframe process presence.
- Relevant EE.log lines with unrelated text and identifiers excluded.
- App/overlay screenshot or a reason no screenshot was safe or applicable.
- Overlay label, position, dimensions, visibility, focus behavior, and monitor.
- Relevant emitted/listened event and detector-state file changes.
- Pass, Fail, Blocked, or Not Applicable result.

Simulated transitions use IDs beginning `SIM-` and can validate deterministic recovery/error branches, but never substitute for a required `LIVE-` result.

## Session A: startup, attachment, and sidebar

| ID | Operator action | Expected evidence |
| --- | --- | --- |
| LIVE-BASE-001 | Leave Warframe at the Orbiter and reply `ready`. | Frozen app starts with the isolated profile; real profile hashes remain unchanged. |
| LIVE-BASE-002 | Do nothing while the auditor starts monitoring. | Detector/helper processes start once, attach to the current Warframe process, remain stable, and report a comprehensible status. |
| LIVE-SIDEBAR-001 | Use the configured sidebar hotkey once. | Sidebar opens on the configured monitor/side without stealing unusable focus or hiding the game unexpectedly. |
| LIVE-SIDEBAR-002 | Resize or drag only when instructed, then close and reopen via the hotkey. | Width, side, and placement persist; minimum/maximum constraints hold. |
| LIVE-SIDEBAR-003 | Return focus to Warframe, then switch away once. | Hide-on-focus-loss behavior matches the saved setting and the sidebar recovers on the next hotkey. |

## Session B: normal Void Fissure

This session can be scheduled only when a suitable fissure is currently available.

| ID | Operator action | Expected evidence |
| --- | --- | --- |
| LIVE-FISSURE-001 | Open the fissure mission picker but do not select a mission. | No false mission-start or reward overlay. |
| LIVE-FISSURE-002 | Select a normal, non-endless fissure and equip a relic. | Relic selection/state is detected once; no duplicate overlay. |
| LIVE-FISSURE-003 | Start the mission and play normally until ten Reactant are collected. | Mission phase and Reactant/relic state advance without premature reward display. |
| LIVE-FISSURE-004 | Reach the reward-selection screen and stop input. | Reward OCR/overlay opens promptly, shows the visible rewards without invented entries, and is placed on the intended monitor. Timing is measured from visible reward cards. |
| LIVE-FISSURE-005 | Select a reward, continue through mission completion, and return to the Orbiter. | Reward overlay closes; state resets; no stale overlay remains. |

## Session C: endless Void Fissure

| ID | Operator action | Expected evidence |
| --- | --- | --- |
| LIVE-ENDLESS-001 | Start an endless fissure with a relic and complete the first reward interval. | First reward transition is detected once and the overlay content matches the visible cards. |
| LIVE-ENDLESS-002 | Choose to continue and equip the next relic. | First-cycle state clears and the new relic/round is recognized without restarting the detector. |
| LIVE-ENDLESS-003 | Complete the second reward interval. | Second reward transition appears once with fresh content; no previous-cycle data leaks into it. |
| LIVE-ENDLESS-004 | Extract at the next offered exit. | Overlay closes and detector returns to an attached-idle state. |

## Session D: Riven screen and optional reroll

| ID | Operator action | Expected evidence |
| --- | --- | --- |
| LIVE-RIVEN-001 | At the Orbiter, open the Mod station and then open one chosen Riven without rerolling it. | Riven-open transition is detected; OCR result belongs to the visible Riven; overlay opens once and remains stable. |
| LIVE-RIVEN-002 | Close the Riven detail view. | Riven overlay closes and no stale `riven-screen` state remains active. |
| LIVE-RIVEN-003 | Reopen the same Riven. | Repeated open is detected reliably and overlay placement persists. |
| LIVE-RIVEN-004 | Optional: after the auditor asks again and the operator explicitly authorizes spending Kuva, perform exactly one reroll and stop at the choice screen. | Old/new rolls are distinguished and the overlay updates once without losing the prior comparison context. |
| LIVE-RIVEN-005 | Close the screen without further rerolls. | Overlay closes and detector returns to idle. |

If `LIVE-RIVEN-004` is declined, it is recorded Blocked by authorization—not failed and not inferred from simulation.

## Session E: notifications and game exit

| ID | Operator action | Expected evidence |
| --- | --- | --- |
| LIVE-NOTIFY-001 | Permit one preconfigured, currently satisfiable notification rule to remain active. | Exactly one correctly worded OS notification is delivered at the configured position/sound setting and is recorded in app history. |
| LIVE-NOTIFY-002 | Leave the matching state unchanged through the next evaluation. | Deduplication prevents notification spam. |
| LIVE-EXIT-001 | Exit Warframe normally and wait at the desktop. | Detachment is detected; overlays close; helpers do not loop or consume sustained CPU; UI reports an understandable disconnected state. |
| LIVE-EXIT-002 | Relaunch Warframe and stop at the Orbiter. | Reattachment succeeds without restarting Kieda's Orbiter and without duplicate helpers. |

## Deterministic simulated matrix

After live evidence is captured, isolated simulations exercise branches that would be unsafe or impractical to force in a real account:

- Missing, truncated, rotated, and inaccessible EE.log.
- Warframe exits during relic selection, reward OCR, Riven OCR, and overlay display.
- Duplicate/out-of-order detector events and rapid open-close-open sequences.
- OCR timeout, empty result, malformed result, missing model, and helper crash.
- Overlay process crash, stale PID file, unavailable monitor, changed scale factor, and removed display.
- Offline WorldState/Market/Wiki, HTTP timeout, malformed JSON, and cached-data fallback.
- Notification rule with missing fields, invalid filter values, duplicate match, and expired state.

Every simulated result is labeled `SIM-` in the ledger and includes its injected input. No simulation can upgrade a missing live requirement to Pass.

## Completion rule

The live portion is complete only when every applicable `LIVE-` row above has direct evidence. Unavailable mission types, declined account-changing actions, disabled OS notification capability, or missing display configurations are recorded Blocked with the exact prerequisite and next action needed for a future session.
