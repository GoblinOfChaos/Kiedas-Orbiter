# Stage 2 decision packet

**Recommendation: accept a Linux-scoped development milestone with the explicit deferrals below. Decision: PENDING. The original full gate remains HELD until the user decides.**

This is a proposed scope decision, not a claim that every original cross-platform requirement passed. No test requirement is silently deleted, and unavailable tests are not counted as successes. Accepting this packet would recognize the tested isolated Preview shell and allow planning the next milestone; it would not authorize publication, installation over stable, live integration activation, or unspecified app-source changes.

## Delivered scope

One shared codebase with an isolated Preview identity/profile, grouped navigation retaining all 20 routes and existing screen bodies, eight preserved overlay definitions, disabled live integrations/updater, explicit copy import, validated recovery journal/locks and native import UI. Existing features are preserved; no generated artwork was added. All implementation remains in the isolated checkout and cumulative patch.

Linux evidence includes package identity/coexistence/removal, Ubuntu-compatible binaries, extraction-mode AppImage launch and resources, guarded IPC, native import and recovery scenarios, actual old/new import-data compatibility, native keyboard navigation, updater disabled-state UI, and missing-directory/stable-migration controls. Consult CURRENT-ACCEPTANCE.md and each linked report for the exact artifact and test tier. Earlier tests on prior artifacts are not restated as reruns on the latest packages.

Latest updater packages have 26 native assertions each; the final directory batch adds nine Preview failure-path assertions and 18 stable migration mechanism assertions. These are separate groups, not an exhaustive end-to-end test count. The stable migration probe is a dev-profile baseline build with application debug assertions disabled, not a qualified stable release package.

## Explicit deferrals requiring acceptance

| Open coverage | Proposed treatment | Trigger to revisit |
|---|---|---|
| Windows build/install/profile/webview/runtime | BLOCKED; no Windows support claim from this milestone | Suitable Windows CI/test environment or external tester |
| macOS native matrix | UNAVAILABLE as user stated; no macOS support claim | Suitable macOS environment/tester, if pursued |
| Published-release version upgrade and future schema changes | PENDING; both tested real payloads report 1.3.3 | A versioned release candidate or new migration implementation exists |
| Exhaustive startup OS/hotkey/game/notification/network tracing and native stale-provider-state injection | UNTESTED beyond source/guard/native UI evidence and supplied stale-manifest rendering | Focused isolation instrumentation before enabling integrations or distribution claims requiring it |
| FUSE, clean-desktop dependencies, Wayland/portal behavior, other Linux baselines | UNTESTED/BLOCKED; current evidence is equipped Ubuntu 24.04 plus extraction-mode AppImage | Matching desktop/test environments and release-support matrix |
| Stable migration copy-I/O failures; broader settings races and filesystem/power-loss cases | UNTESTED; handled import errors and SIGKILL recovery are already covered in their stated scope | Relevant behavior changes or separately scoped robustness testing |
| Every in-screen live-data workflow, native chooser keyboard-only acceptance and full locale/size permutations | UNTESTED beyond recorded route/import/locale cases | Screen-specific milestones and supervised integration testing |

The broader platform and release work must remain visible after a Linux milestone acceptance. Accepting it is not an assertion that the omitted coverage is impossible to perform here, nor that source guards prove zero OS/network activity under every condition.

## Integrity and handoff

Fresh evidence/gate-review-integrity.json verifies all 850 original tracked files, unchanged application lockfile, current artifact hashes, equality of implementation.patch to the actual isolated diff, and git apply --check against the original baseline. The patch was not applied to the original checkout. No app source or builds changed during this gate-review round.

The cumulative patch is the durable implementation handoff; implementation.json lists uncommitted isolated changes. The work has not been committed/published as a new release. Prior packages and before/after evidence are preserved where recorded. Two historical build-log overwrite incidents are explicitly disclosed in evidence/ubuntu-native-build-log-overwritten.txt and evidence/stable-migration-build-log-disclosure.md; those lost logs are not reconstructed. Review should use the cited surviving evidence, not assume a complete historical log archive.

If the user accepts the proposed Linux scope and deferrals, record that decision before preparing the next milestone's concrete plan. If the full original gate is retained, keep Stage 2 held and choose the remaining validation work explicitly. No Stage 3 implementation begins from this document alone.
