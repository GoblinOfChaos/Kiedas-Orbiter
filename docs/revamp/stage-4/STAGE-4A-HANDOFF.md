# Stage 4A — Foundation, Shell, and Dashboard Handoff

## 1. Purpose and stop state

This is the durable takeover point for Stage 4A. Codex stopped because the user reported that weekly usage was at 88% and explicitly directed that no new implementation step, new file other than this handoff, or new build phase begin.

There is no active build, package, container, WebDriver, Xvfb, D-Bus, or validation process. The checkout is not partially compiling and no shared target cleanup is in progress. All validation processes described below exited normally. No host package was installed.

**Current gate:** `IMPLEMENTED AND VALIDATED — LINUX — awaiting explicit user acceptance`.

Do not interpret this handoff as Stage 4A acceptance or authority to begin Stage 4B. Stage 4B and every later application-source stage remain separately gated. Windows remains **OPEN / BLOCKED** and macOS remains **OPEN / UNAVAILABLE** until real hardware or CI exists.

## 2. Checkout identity and topology

| Item | Exact value |
|---|---|
| Main repository | `/var/home/jedwards/kiedas-orbiter` |
| Isolated implementation checkout | `/var/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center` |
| Branch | `revamp/stage4-command-center` |
| HEAD | `f30ea7e9f7fe1f12406257018a2a8cff8c21158d` |
| Reconstruction | Original main baseline plus the accepted Stage 3 cumulative patch, which already includes Stage 2 |
| Working-tree model | Intentionally uncommitted cumulative Stage 2 + Stage 3 + Stage 4A implementation |
| Current Git-visible delta | 69 changed or created files relative to HEAD; displayed by 41 porcelain entries because untracked directories are collapsed |
| Accepted ignored lockfile | `src-tauri/Cargo.lock`, present even though repository rules ignore it |
| `node_modules` | Symlink to `/var/home/jedwards/kiedas-orbiter/node_modules` |
| Current Preview frontend bundle | `dist/`, 201 files, deterministic tree digest `455569d50e59464d17226b13b2f5b0ae9c8320e3ed4640d6026203bbf53a2def` |
| `dist/index.html` | 1,203 bytes; SHA-256 `bab4e2dc1e7a41cba37f9e655268b61295e41e7fb58a3b6e13f926dd3d81da22` |
| Rust target | Shared at `/var/home/jedwards/kiedas-orbiter/.preview-work/ubuntu-build/target`, outside the checkout |
| Original repository tracked baseline | 850 files checked against HEAD; zero mismatches |

The main repository has only the untracked `.preview-work/` and `docs/revamp/` work areas. Its 850 tracked files remain byte-identical to its HEAD. All application changes remain inside the isolated checkout.

## 3. Stage 4A outcome

Stage 4A replaces the transitional Preview wrapper with the approved command-center foundation:

- One verified 20-route registry drives the grouped Preview navigation and preserves Stable route order.
- Desktop Preview uses a 248px grouped navigation column.
- Compact Preview uses a 72px icon rail plus an accessible navigation drawer.
- The global header provides route search, truthful inventory-sync state, Preview capability/profile state, and the existing import entry point.
- The route workspace has one explicit vertical scroll owner and blocks page-level horizontal overflow.
- The Dashboard uses the approved `Your next adventure` composition, three summary panels, continuing plans, recent session activity, ready-to-craft rows, and all 19 existing Dashboard surfaces.
- Farming Targets truthfully reports zero and unavailable until Stage 4C implements the real capability. No synthetic target count ships.
- Preview does not start the two-second `get_scanner_status` shell poll and does not register the `scanner-hooked` notification listener.
- Stable retains its existing scanner poll/listener and exact Dashboard behavior.
- No new raster or AI-generated artwork was added. Navigation uses existing repository assets and Lucide icons.

The implementation report is `docs/revamp/stage-4/STAGE-4A-IMPLEMENTATION-REPORT.md`, SHA-256 `6d76be9d5a6c4b714547bd8af1d544387ed6bfddee0c1f0f36021279c80bbf05`.

## 4. Section 15 implementation-order ledger

This table maps directly to Section 15 of `STAGE-4A-FOUNDATION-SHELL-DASHBOARD-SOURCE-PLAN.md`.

| Step | State | Evidence/result |
|---:|---|---|
| 1. Reconstruct and verify fresh Stage 4 checkout | **DONE** | Reconstructed at the path above; 744 accepted application files compared with zero mismatch. |
| 2. Freeze source facts, route labels, Dashboard IDs, selectors and mockup hashes | **DONE** | `stage4a-source-register.json`, `stage4a-preflight.json`, and `stage4a-source-facts.json`. |
| 3. Add route registry and prove Stable nav output | **DONE** | 20 unique routes, exact Stable order, six groups; source and component evidence pass. |
| 4. Add semantic tokens and shared primitives | **DONE** | Five Preview CSS layers and four shared components created. |
| 5. Add shell components, search and status normalization | **DONE** | Six shell components plus navigation registry created and validated. |
| 6. Wire Preview shell and suppress Preview scanner poll/listener | **DONE** | `App.jsx`; full-App module-boundary evidence records zero scanner poll and notification invocation. |
| 7. Add pure Dashboard view-model adapter | **DONE** | `src/preview/view-models/dashboardViewModel.js`; no Tauri/React/network/filesystem access. |
| 8. Add Dashboard view and wire Preview branch | **DONE** | New Dashboard view plus minimal `Dashboard.jsx` branch. |
| 9. Run source, component, Stable, accessibility, responsive and visual checks | **DONE** | All listed matrices pass; counts are in Section 7 below. |
| 10. Stop for app defect or out-of-scope source need | **SATISFIED** | One app-source import correction was surfaced and explicitly approved; no unresolved source defect remains. |
| 11. Rebuild Debian and AppImage with bounded toolkit | **DONE** | Ubuntu 24.04 offline/locked release build and unsigned local bundles completed with four-job CPU limit. |
| 12. Run complete package and safety matrices | **DONE** | Debian 141/141 and AppImage 141/141, including 40 native all-route cases apiece. |
| 13. Generate native patches, integrity records and report | **DONE** | Both patches apply cleanly; final integrity and postflight evidence exist. |
| 14. Present screenshots/evidence for explicit acceptance | **PRESENTED / ACCEPTANCE PENDING** | Screenshots and report were presented. The user has not explicitly accepted Stage 4A after the final 141-check package matrix. |

### Remaining Stage 4A work

There is no unfinished implementation, build, or validation action from Section 15. The only remaining Stage 4A gate action is human review and explicit acceptance of the final state. If application source changes during takeover, the affected validation layers must be rerun and the report/patches regenerated; the current passing evidence then describes the pre-change state only.

Independent carried items are not Stage 4A screen work:

- Windows runtime: **BLOCKED** pending hardware or CI.
- macOS runtime: **UNAVAILABLE** pending hardware or CI.
- Genuine published-version upgrade: **PENDING**.
- Exhaustive runtime tracing: **PENDING**.
- Stage 4B and later implementation: **NOT STARTED / NOT AUTHORIZED by this handoff**.

## 5. Exact Stage 4A incremental source delta

The native incremental patch is `docs/revamp/stage-4/stage4a-implementation.patch`, SHA-256 `d4236719bf7b12944bb68e6bc5ff1156029d010e520471d20057bb80e2b9c692`. It contains exactly the 23 authorized paths below and applies cleanly to the accepted Stage 3K checkout.

| Path | Stage 4A state | Current SHA-256 |
|---|---|---|
| `src/App.jsx` | modified | `5470d3ef26175059637019a3f587ff825d038c23e6e46ff6c704036d37d4ae52` |
| `src/components/PreviewDashboardLayout.jsx` | deleted | pre-deletion `a624ad4ec319a00cf6464604b8d0923d0eff4305801e3163361fa3a50f892390` |
| `src/components/PreviewNavigation.jsx` | deleted | pre-deletion `a69f4b2d21bbeeedba087acc4b3b37fd11ae4b2501a69a7d79791abb3d8bb6a4` |
| `src/lib/i18n/en.json` | modified | `b7d7b16f34b24434fd4d40ab72bb314f414c5d110328565fd80133e8f680cfa5` |
| `src/preview/components/PreviewButton.jsx` | created | `1c80f116b5efcd19f893d40191af27ac86e16e99f051b389a7a4800d866681d9` |
| `src/preview/components/PreviewDataState.jsx` | created | `931f540cc582b42a05acf67d9a552a63bee53b01c5f0384bca397cf4caf81559` |
| `src/preview/components/PreviewPanel.jsx` | created | `2bc05a4f173149cb7a8bfedce5caea17904cb65f56cbfa32f4e995170ff048b7` |
| `src/preview/components/PreviewStatusBadge.jsx` | created | `fd6ca0eb0c2078271e206b6fc1808315c21608926eefec6fa93c79a49b593c25` |
| `src/preview/dashboard/PreviewDashboardView.jsx` | created | `8490e1e5b4c1325df9e520c0a4669dc587b0785ac2870cf3400a7f76b0ff4a2f` |
| `src/preview/navigation.js` | created | `680cc866641dd7600c600599b04fb4cd52c8b49759a4a5f5c9c95a43de12ceae` |
| `src/preview/shell/PreviewAppShell.jsx` | created | `da7a9330e33e71ce323c5306afabd81c17bc92bcc2f76abafcdaf5322198de8c` |
| `src/preview/shell/PreviewGlobalHeader.jsx` | created | `7072645c1b0df51ff50cb7b6faa9c7cfb7f1fd5b631e36184077a0ecf7a15491` |
| `src/preview/shell/PreviewNavigation.jsx` | created | `faf020d361f0ec541a0a175c1bfa8bb2b5ce10ab3a77608de59250e09b792a3a` |
| `src/preview/shell/PreviewPage.jsx` | created | `2ab73707ed59d729b0f37e0a5b225bfef59bc63b16a3fd272d7a82a9baa192a4` |
| `src/preview/shell/PreviewRouteSearch.jsx` | created | `8b559dd30835c1530dc892bf96477daf766c33c628e6e5a51769f5c69344ae18` |
| `src/preview/shell/PreviewStatusSummary.jsx` | created | `b74be6afeae0a70e2d272860f291b0a784b29b8bd3b81337bb46c52646e583d8` |
| `src/preview/styles/preview-components.css` | created | `70e76e0f7f4637e380059718cf09abbacca74ef57b52b20dd57f111b6b00b263` |
| `src/preview/styles/preview-dashboard.css` | created | `730eea4d0af95e84994a6f145ecb09cc302d8034ef28c8c4f34da5f6d3d518c9` |
| `src/preview/styles/preview-responsive.css` | created | `9512984b0ddde55b91ca9399b7b68341fe92aaa5d5d98c9a9bb712fc6e7f2382` |
| `src/preview/styles/preview-shell.css` | created | `e3e70cd585a4b4b0ab05b047432feeec64d345be1829be5845e4293d66c18665` |
| `src/preview/styles/preview-tokens.css` | created | `dcbfe48ca5f1394aace9aae30b5b4f788c32d391388a21a19d6e96cb37dbd4f6` |
| `src/preview/view-models/dashboardViewModel.js` | created | `19b94bb5774c622fb5d942c1cbc5d2060ce6983f51a1709d47078b72e84206d3` |
| `src/screens/Dashboard.jsx` | modified | `2968641dcfbcea9f1c46338ed84009ddf84db779f38cb37d8bef76f6e4b38d4b` |

## 6. Complete cumulative checkout manifest

The cumulative patch is `docs/revamp/stage-4/stage4a-cumulative-implementation.patch`, SHA-256 `f711dd2d565458a3423ebd38dc4c1cde7cc186396023b91247234322af7a9498`. It represents the complete current source state relative to original HEAD and applies cleanly there. Stage 4A-specific files are repeated because this is intentionally a complete takeover manifest.

| Path | State vs original HEAD | Current SHA-256 |
|---|---|---|
| `package.json` | modified | `38d907ebd28487ff2f81b77733ce9b4bb2460d2a552400a3fe1ad0442124229e` |
| `scripts/preview-checks/.gitignore` | created | `306fd52e74fca6746e12acc750f232de15e71da917756a1270d74c91f5eb7368` |
| `scripts/preview-checks/Cargo.lock` | created | `fb42e2e103c2a8d44642ea33d4298be219504c772a1ffcd6ea7c92f7b0c2fb31` |
| `scripts/preview-checks/Cargo.toml` | created | `2983029a787107edf4ac2990a3a7dcbb06953783889cab4f0be64f296edc2e77` |
| `scripts/preview-checks/src/lib.rs` | created | `714c5cb3e6c23149ec8d465e8a93c791277109c152fa0ecd09c2e72123f8c0b5` |
| `scripts/preview-checks/verify-config.mjs` | created | `bf31aa816390d349435c065bbbd1fc29e10f1d7a296c6338a1860b35c3c299b9` |
| `scripts/run-preview.mjs` | created | `4f9258f55c2b48d00e9b8aae33e30450d7d5115e5cd2cc8c295cd36786d8db2c` |
| `src-tauri/Cargo.toml` | modified | `9c5be029da33292c0fe1b8096ffd0bd83fbf059b24ec1b15fba6d03caa9f4f37` |
| `src-tauri/icons/preview/128x128.png` | created | `cc07fa392354f13f4fa35adc9a93b015d4c267a921d9d42187f9f23c53275dee` |
| `src-tauri/icons/preview/128x128@2x.png` | created | `d5f63df62e16c76e9e13d993f7b561271b9d59ffa5dc2152bcf70050c2f35058` |
| `src-tauri/icons/preview/32x32.png` | created | `456265026018f8ce8fe5ef4a54e066ca8d1ba6a557439920cfa15a78ca9114f8` |
| `src-tauri/icons/preview/PROVENANCE.md` | created | `7e8f21e08c8b621f79090067915ba9c8e29587d71d7c899d697190078a606ac2` |
| `src-tauri/icons/preview/badge.svg` | created | `0ad3dc18a6948de8cd55e6784bc4d261a8abdd51f66194227e50ac72c2fd79cf` |
| `src-tauri/icons/preview/icon.icns` | created | `6943b53da8881dd117f5f87e87e6fe0c010e9e3a08fa29460131054bc324e4ea` |
| `src-tauri/icons/preview/icon.ico` | created | `9adb93b97395f32d5bc9d9e856d62aedcb4eef132a26b87a7313f1e71514f75f` |
| `src-tauri/icons/preview/icon.png` | created | `8d61ccf01696613407c07ac55f756e81f7445519d7539fe511136a994d722af2` |
| `src-tauri/src/build_profile.rs` | created | `7279088e3030a9627be15229aefaa73a300b571bacdc06cea890efa0e5da3b93` |
| `src-tauri/src/main.rs` | modified | `0b5a45af2c231e7231dbee8f4cbf39b4d64db0624235f43d3c9eb5ad2202c7a6` |
| `src-tauri/src/ocr.rs` | modified | `9e55f1c192696b4c97779d7084362e298c3b86dd74eeef7e19a7c2228db6551c` |
| `src-tauri/src/overlay_utils.rs` | modified | `5c99f63a86eccea863e288a86187cbaf0a90850ce0b690e82cefda2cf8d635a9` |
| `src-tauri/src/preview_import.rs` | created | `59017e2f064bfaa67426a46957165a7d5c2437d876d426e1c9f56d0a7312a6c8` |
| `src-tauri/src/preview_import_tests.rs` | created | `b2c1b2207f3f85d690b8dcd3b09b651547825fbe4c32601790b10ccf0104b998` |
| `src-tauri/tauri.preview.conf.json` | created | `55911fdc99c3654d7b88cf43663a3cf9f999b1a0249b3eb8d5bc3dc68bb2c773` |
| `src/App.jsx` | modified | `5470d3ef26175059637019a3f587ff825d038c23e6e46ff6c704036d37d4ae52` |
| `src/components/PreviewCosmeticsLayout.jsx` | created | `5ca0500805cff9d82d5050049d2f2b16453592bebb8ab372cc011d91a13c2d5a` |
| `src/components/PreviewImport.jsx` | created | `f7129bc29168e06128a37d69b65f5ef6dcf1f258a50e9115ef58094da2907ff8` |
| `src/components/PreviewInventoryLayout.jsx` | created | `7824d1c744ccbded5b539db0cb19f34d84d97672a523f777ca8c7d8beedcf9d9` |
| `src/components/PreviewMapsLayout.jsx` | created | `bd7e003eb3acfd6faa233900e8d2760690d1d49957f6d2a1b1327c3bc9039fff` |
| `src/components/PreviewMarketLayout.jsx` | created | `d1d942abdf67052c42ab7bc6eeb66a59c551f631a92bc215436764ef71a0066d` |
| `src/components/PreviewMasteryLayout.jsx` | created | `8ba7a5420d883d52d58dba0c6f8c4992927fbe7dcd353baf3bf4fe38a9f103f0` |
| `src/components/PreviewModsLayout.jsx` | created | `7d01ca30b52906a3a91bb3889bc92fd6be9934942ed99264017dd454678c9fda` |
| `src/components/PreviewRelicPlannerLayout.jsx` | created | `b8cb04856a8c3cd4cdf94399c2ed1648b6d95328a7eea7c7eb014885d847e938` |
| `src/components/PreviewRelicsLayout.jsx` | created | `6c5b95a03a4d9d0f7c8cc597c91ea9935b39de593c0af161b8e8aee8aebfcea5` |
| `src/components/PreviewRivensLayout.jsx` | created | `49428c41caf076e243340979dad42bd59b863c5c7a2db4e1224c19af7a944c44` |
| `src/components/PreviewSettingsLayout.jsx` | created | `6669cb44b1f90db1cabb470302fbb1888515ba7e4f397052d345c0281f98a479` |
| `src/contexts/MonitoringContext.jsx` | modified | `033b5f15b1ff475381d5078ca2e5b4fd0e53e845b9393ec11cae9b24ffb0626e` |
| `src/contexts/UpdateContext.jsx` | modified | `de5046061b4877d20544b79ecbaf3579fbd30a1b0c8381016df68b51bb2bf0fc` |
| `src/lib/buildProfile.js` | created | `b7b4c317980fb3e585c16861801f494cf70e19c50ffc7ab9426053499b911bcc` |
| `src/lib/i18n/en.json` | modified | `b7d7b16f34b24434fd4d40ab72bb314f414c5d110328565fd80133e8f680cfa5` |
| `src/main.jsx` | modified | `e87a601ccbefa5b7d2efe2a9238cd841ce3284e1e97c5a3058bbc15a39f704c2` |
| `src/preview/components/PreviewButton.jsx` | created | `1c80f116b5efcd19f893d40191af27ac86e16e99f051b389a7a4800d866681d9` |
| `src/preview/components/PreviewDataState.jsx` | created | `931f540cc582b42a05acf67d9a552a63bee53b01c5f0384bca397cf4caf81559` |
| `src/preview/components/PreviewPanel.jsx` | created | `2bc05a4f173149cb7a8bfedce5caea17904cb65f56cbfa32f4e995170ff048b7` |
| `src/preview/components/PreviewStatusBadge.jsx` | created | `fd6ca0eb0c2078271e206b6fc1808315c21608926eefec6fa93c79a49b593c25` |
| `src/preview/dashboard/PreviewDashboardView.jsx` | created | `8490e1e5b4c1325df9e520c0a4669dc587b0785ac2870cf3400a7f76b0ff4a2f` |
| `src/preview/navigation.js` | created | `680cc866641dd7600c600599b04fb4cd52c8b49759a4a5f5c9c95a43de12ceae` |
| `src/preview/shell/PreviewAppShell.jsx` | created | `da7a9330e33e71ce323c5306afabd81c17bc92bcc2f76abafcdaf5322198de8c` |
| `src/preview/shell/PreviewGlobalHeader.jsx` | created | `7072645c1b0df51ff50cb7b6faa9c7cfb7f1fd5b631e36184077a0ecf7a15491` |
| `src/preview/shell/PreviewNavigation.jsx` | created | `faf020d361f0ec541a0a175c1bfa8bb2b5ce10ab3a77608de59250e09b792a3a` |
| `src/preview/shell/PreviewPage.jsx` | created | `2ab73707ed59d729b0f37e0a5b225bfef59bc63b16a3fd272d7a82a9baa192a4` |
| `src/preview/shell/PreviewRouteSearch.jsx` | created | `8b559dd30835c1530dc892bf96477daf766c33c628e6e5a51769f5c69344ae18` |
| `src/preview/shell/PreviewStatusSummary.jsx` | created | `b74be6afeae0a70e2d272860f291b0a784b29b8bd3b81337bb46c52646e583d8` |
| `src/preview/styles/preview-components.css` | created | `70e76e0f7f4637e380059718cf09abbacca74ef57b52b20dd57f111b6b00b263` |
| `src/preview/styles/preview-dashboard.css` | created | `730eea4d0af95e84994a6f145ecb09cc302d8034ef28c8c4f34da5f6d3d518c9` |
| `src/preview/styles/preview-responsive.css` | created | `9512984b0ddde55b91ca9399b7b68341fe92aaa5d5d98c9a9bb712fc6e7f2382` |
| `src/preview/styles/preview-shell.css` | created | `e3e70cd585a4b4b0ab05b047432feeec64d345be1829be5845e4293d66c18665` |
| `src/preview/styles/preview-tokens.css` | created | `dcbfe48ca5f1394aace9aae30b5b4f788c32d391388a21a19d6e96cb37dbd4f6` |
| `src/preview/view-models/dashboardViewModel.js` | created | `19b94bb5774c622fb5d942c1cbc5d2060ce6983f51a1709d47078b72e84206d3` |
| `src/screens/Cosmetics.jsx` | modified | `1dea6a35477e952d2d6ea27e0d48d6616b80d5885706cfbc98cf32e54f1a3b45` |
| `src/screens/Dashboard.jsx` | modified | `2968641dcfbcea9f1c46338ed84009ddf84db779f38cb37d8bef76f6e4b38d4b` |
| `src/screens/Inventory.jsx` | modified | `867553ce86dcef88d3d105e31351a277bf782e5187c59d26d67a1de167fd8880` |
| `src/screens/Maps.jsx` | modified | `44c391ba0ca4e10f5aa9a9b6ba63ab777db0c0af06db7ea848ae177fa4ea0ae5` |
| `src/screens/Market.jsx` | modified | `285321b5438f8e2efb3d71ee652bf7d345a5f896079cc88fcd60b18124dabb87` |
| `src/screens/Mastery.jsx` | modified | `be334f79a846628f045e0f11e5a08fd18fe999de3d28f0576df08ea51d2b4bbd` |
| `src/screens/Mods.jsx` | modified | `c3c7b278911a36a100b923f5e404a1edceb5f27e7928961f2ccd09fb4f3c3fb2` |
| `src/screens/RelicPlanner.jsx` | modified | `ef34ebf63d9a46be39dbaa67c6f91a7070a21fa9faa09f2209b56d646c513e76` |
| `src/screens/Relics.jsx` | modified | `24c2f9cf0faeb9b45a83f6381e51a43088c393dd530e242c5f90847d86f5eef3` |
| `src/screens/Rivens.jsx` | modified | `3e78cd09f1d73cea7d54a8bf047c6eabcf5cf644a1bf0d763c1f1bb3b5244dc7` |
| `src/screens/Settings.jsx` | modified | `567fcaf2c1188ed338889384d9c00891245a0087b0654f89e9025cf7f0cff736` |

### Ignored but required build input

`src-tauri/Cargo.lock` is present with SHA-256 `e8508bffd0423001766a5e3fe2fe81a814d79795b7cfb13189fc3dfc2a2e31c1`, exactly matching `/var/home/jedwards/kiedas-orbiter/.preview-work/stage2/src-tauri/Cargo.lock`. Because it is Git-ignored, it is absent from both patches and must be copied separately into any newly reconstructed checkout before an offline `--locked` native build.

## 7. Verification state

| Layer | Final result | Primary record |
|---|---:|---|
| Source facts and authorized scope | 18/18 | `evidence/stage4a-source-facts.json` |
| Preview shell/Dashboard component matrix | 31/31 | `evidence/stage4a-component.json` |
| Stable Dashboard exact markup and callbacks | 19/19 | `evidence/stage4a-stable-markup.json` |
| Theme-token matrix | 14/14 | `evidence/stage4a-theme-matrix.json` |
| Responsive landmark matrix | 4/4 | `evidence/stage4a-visual-landmarks.json` |
| Full real-`App.jsx` shell boundary | 21/21 | `evidence/stage4a-app-boundary.json` |
| Debian native/package matrix | 141/141 | `evidence/stage4a-deb-packaged-smoke.json` |
| AppImage native/package matrix | 141/141 | `evidence/stage4a-appimage-packaged-smoke.json` |
| Independent final postflight | 18/18 | `evidence/stage4a-postflight.json` |
| Original tracked baseline | 850/850, zero mismatch | `evidence/stage4a-baseline-check.json` |

The 141 package checks include the prior 101 screen/import/isolation/guard checks plus 40 cases selecting all 20 real packaged routes at both 1200×800 and 900×500. The full-App boundary captures only icon `read_file_bytes` calls after initial load and the real two-second poll interval. It records zero calls to:

- `get_scanner_status`
- `show_notification`
- `relay_event`
- `stop_log_scanner`
- `post_market_order`
- `delete_market_order`
- `update_market_order`
- `close_market_order`

Both native packages also directly reject all four marketplace mutations and the five retained live/update negative probes.

Final evidence integrity is recorded in `docs/revamp/stage-4/evidence/stage4a-evidence-integrity.json`, SHA-256 `33670bafdf0d3673caf4ba09d1691056ab32dab25decde6225f69da847af042a`. It contains current hashes for 62 final Stage 4A evidence/report/patch files and deliberately excludes its own hash.

### Visual proof

| File | Purpose |
|---|---|
| `evidence/stage4a-dashboard-desktop.png` | 1440×900 expanded command center |
| `evidence/stage4a-dashboard-compact.png` | 900×500 compact rail and single-scroller layout |

Both are code-rendered fixture screenshots using synthetic labels/data and existing repository assets. No generated artwork is present.

## 8. Current local artifacts

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| `/var/home/jedwards/kiedas-orbiter/.preview-work/ubuntu-build/target/release/kiedas-orbiter` | 71,746,872 | `80d30cf8b4abce11c05074636b7b9395b6d3b8bc412dee374c248115f756f344` |
| `/var/home/jedwards/kiedas-orbiter/.preview-work/ubuntu-build/target/release/kiedas-orbiter-preview` | 71,746,872 | `80d30cf8b4abce11c05074636b7b9395b6d3b8bc412dee374c248115f756f344` |
| `/var/home/jedwards/kiedas-orbiter/.preview-work/ubuntu-build/target/release/bundle/deb/Kieda's Orbiter Preview_1.3.3_amd64.deb` | 116,361,416 | `00edfa36c7fced5f9e187d372ecc3950cc68a999c531d119fc4f214378824d6b` |
| `/var/home/jedwards/kiedas-orbiter/.preview-work/ubuntu-build/target/release/bundle/appimage/Kieda's Orbiter Preview_1.3.3_amd64.AppImage` | 190,097,912 | `15cfc5e9584a69bab43048fb361026524d849fb49116a4dd957448491e3e7a52` |

These are unsigned local validation artifacts. They were never published. Debian installation/removal occurred only in a disposable network-disabled container. The AppImage was mounted/launched only inside its disposable validation container.

## 9. Known issues and corrections

### Applied application-source correction: `LoaderCircle` to `Loader2`

The first Preview frontend build found that the installed Lucide version exports `Loader2`, not `LoaderCircle`. Work stopped because this touched real application source. The user explicitly approved changing `PreviewDataState.jsx` to `Loader2`. Both Preview and Stable frontend builds subsequently passed. Current file hash is listed in Section 5.

### Applied build-input correction: missing ignored `Cargo.lock`

The first native build stopped before compilation because the fresh Stage 4 checkout omitted the Git-ignored `src-tauri/Cargo.lock`. The original preflight incorrectly excluded it as generated. The user independently verified and approved restoring the accepted Stage 2 file. It was copied byte-for-byte; no dependency resolution ran. `preflight.py` now includes it in comparisons, and `stage4a-source-facts.py` requires its presence and exact equality. The failed attempt is preserved under `evidence/before-lockfile-restoration/`.

### Corrected test/evidence tooling issues

These did not change shipped application behavior. Their failed logs are preserved in descriptive `evidence/before-*` directories:

- Source parser originally recognized only quoted JavaScript keys.
- Component fixture used outdated status property names and initially referenced shortened labels instead of current translations.
- Component entry filename and host-access startup were corrected.
- Package harness initially wrote Stage 3 evidence to the Stage 4 folder and selected hidden compact controls.
- Width assertions assumed the old shell content width; the 72px rail legitimately allows more columns.
- Relic Planner test expected all content to fit vertically instead of using the existing screen-level scroll owner.
- Full-App alias isolation did not intercept lazy modules; it was replaced with a deterministic, hash-recorded import-boundary transform.
- WebDriver could not clone listener functions; capture was narrowed to serializable values.
- Drawer Escape needed dispatch on the focused element.
- WebKit refresh required an explicit empty JSON request body.
- The original package total omitted the plan's all-20-routes-at-two-sizes requirement; the final Debian and AppImage runs add those 40 cases and pass 141/141.

There is no known unresolved Stage 4A application defect. The dormant, unreachable Inventory sale path remains tracked separately in `docs/revamp/ACCEPTANCE-LEDGER.md` and was not made reachable or changed here.

## 10. Validation tooling location

Stage 4A runners and fixtures are under `/var/home/jedwards/kiedas-orbiter/.preview-work/stage4-validation/`. The final important runner hashes are:

| Tool | SHA-256 |
|---|---|
| `preflight.py` | `7d98353033b675240580ee8fba0d0a6a0002e5ac844fec23de33a6164ad105a6` |
| `restore-accepted-lockfile.py` | `10c4d780bdde5faef30a95dd0774472fa8fc8bfa5c9931faff7d32e4d9af9d0e` |
| `stage4a-source-facts.py` | `b4f4ab88b99f6340ed622ec3dbc571858a2699f97433debf0f815ba1b6175193` |
| `stage4a-component-build.py` | `3d6eff7565e4c7cb502a859081dc2ebd2cf3f70d28547f322bc7279148c858a4` |
| `stage4a-component-runner.py` | `b4e6a602fb3946644e05111ba95b7b69b8d32bcd34ebc9ded5ae5e70cdb68880` |
| `stage4a-stable-build.py` | `aad01ab110a4aa911dc6204e465ca92591a899c7151cba536eceebf92938a3b5` |
| `stage4a-stable-runner.py` | `72470f10fc47b7a2336348afd1f3cc1c9159cc247e94cd6e449b3e039c4de404` |
| `stage4a-app-boundary-build.py` | `eaf28d8f48c9026a20979885a94c60af359084cfea2a44df67bae58abf93b33e` |
| `stage4a-app-boundary-runner.py` | `725dfa1dcf3c824c0e93812f4d2db8878f5b1b3e93e4188fc3d8a31e01b2d97d` |
| `stage4a-frontend.py` | `939203098537612ad06a49263a322d26a422b5864d59d81767cfd5e16a78f3bb` |
| `stage4a-native-build.py` | `88c41d1dc4ff344389838950cef2268a75ead8171968b3c95bfb9cef4bae7ec8` |
| `stage4a-native-bundle.py` | `d76f017ca888f01e82a576e8558991a28d7bc77e24581e90c90ff6d704b1a6b0` |
| `prepare-stage4a-package-smokes.py` | `318d2d6d76babf66ac6df40cfa0eb899add15596277a00c39873975ccc2dbaa6` |
| `stage4a-deb-smoke.py` | `a9432d1f2ebcbc20748c4b4399af3d4a173895a6a6b14ca3aac5a1a795032562` |
| `stage4a-appimage-smoke.py` | `aee9df1e756ee37fe80c8671ad6c940f2316c938accee2c8c19e2e67153556be` |
| `stage4a-finalize.py` | `ee119c34edcb0a6e1b1907f590a0b7430863e20f7070dffddc1b078c6a2d09a8` |
| `stage4a-postflight.py` | `0b193380292655fa016e709e8e2981dbed5b1ae6189ada084b4857eccfc4c9dc` |

Supporting fixtures and preserved failure logs remain in the same directory and `docs/revamp/stage-4/evidence/before-*`. Do not delete them when reviewing the evidence trail.

## 11. Commands to resume from this exact point

### Review or accept the current completed state

No build is required. These commands are read-only and verify the exact stopping point:

```bash
cd /var/home/jedwards/kiedas-orbiter
git -C /var/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center branch --show-current
git -C /var/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center rev-parse HEAD
git -C /var/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center diff --check
sha256sum /var/home/jedwards/kiedas-orbiter/.preview-work/stage4-command-center/src-tauri/Cargo.lock
sha256sum /var/home/jedwards/kiedas-orbiter/docs/revamp/stage-4/stage4a-implementation.patch
sha256sum /var/home/jedwards/kiedas-orbiter/docs/revamp/stage-4/stage4a-cumulative-implementation.patch
git -C /var/home/jedwards/kiedas-orbiter/.preview-work/stage3-maps apply --check /var/home/jedwards/kiedas-orbiter/docs/revamp/stage-4/stage4a-implementation.patch
git -C /var/home/jedwards/kiedas-orbiter apply --check /var/home/jedwards/kiedas-orbiter/docs/revamp/stage-4/stage4a-cumulative-implementation.patch
python3 -c 'import json,pathlib; p=pathlib.Path("/var/home/jedwards/kiedas-orbiter/docs/revamp/stage-4/evidence/stage4a-postflight.json"); d=json.loads(p.read_text()); print({"passed":d["passed"],"total":d["total"],"failures":d["failures"]})'
```

Expected values are branch `revamp/stage4-command-center`, HEAD `f30ea7e9f7fe1f12406257018a2a8cff8c21158d`, no `diff --check` output, lockfile hash `e8508bffd0423001766a5e3fe2fe81a814d79795b7cfb13189fc3dfc2a2e31c1`, incremental patch hash `d4236719bf7b12944bb68e6bc5ff1156029d010e520471d20057bb80e2b9c692`, cumulative patch hash `f711dd2d565458a3423ebd38dc4c1cde7cc186396023b91247234322af7a9498`, both patch checks exiting zero, and postflight `18/18` with no failures.

### Full rerun after any source change

The runners intentionally refuse to overwrite evidence. Archive the current final evidence and artifacts first, then run the existing bounded scripts in this order. This block is provided for takeover; it was **not executed while creating this handoff**.

```bash
cd /var/home/jedwards/kiedas-orbiter
mkdir -p /var/home/jedwards/kiedas-orbiter/docs/revamp/stage-4/evidence/manual-takeover-baseline
find /var/home/jedwards/kiedas-orbiter/docs/revamp/stage-4/evidence -maxdepth 1 -type f -name 'stage4a-*' -exec mv -t /var/home/jedwards/kiedas-orbiter/docs/revamp/stage-4/evidence/manual-takeover-baseline/ {} +
mv /var/home/jedwards/kiedas-orbiter/docs/revamp/stage-4/STAGE-4A-IMPLEMENTATION-REPORT.md /var/home/jedwards/kiedas-orbiter/docs/revamp/stage-4/evidence/manual-takeover-baseline/
mv /var/home/jedwards/kiedas-orbiter/docs/revamp/stage-4/stage4a-implementation.patch /var/home/jedwards/kiedas-orbiter/docs/revamp/stage-4/evidence/manual-takeover-baseline/
mv /var/home/jedwards/kiedas-orbiter/docs/revamp/stage-4/stage4a-cumulative-implementation.patch /var/home/jedwards/kiedas-orbiter/docs/revamp/stage-4/evidence/manual-takeover-baseline/
cp --reflink=auto /var/home/jedwards/kiedas-orbiter/.preview-work/ubuntu-build/target/release/kiedas-orbiter /var/home/jedwards/kiedas-orbiter/docs/revamp/stage-4/evidence/manual-takeover-baseline/
cp --reflink=auto "/var/home/jedwards/kiedas-orbiter/.preview-work/ubuntu-build/target/release/bundle/deb/Kieda's Orbiter Preview_1.3.3_amd64.deb" /var/home/jedwards/kiedas-orbiter/docs/revamp/stage-4/evidence/manual-takeover-baseline/
cp --reflink=auto "/var/home/jedwards/kiedas-orbiter/.preview-work/ubuntu-build/target/release/bundle/appimage/Kieda's Orbiter Preview_1.3.3_amd64.AppImage" /var/home/jedwards/kiedas-orbiter/docs/revamp/stage-4/evidence/manual-takeover-baseline/
python3 /var/home/jedwards/kiedas-orbiter/.preview-work/stage4-validation/stage4a-source-facts.py
python3 /var/home/jedwards/kiedas-orbiter/.preview-work/stage4-validation/stage4a-component-build.py
python3 /var/home/jedwards/kiedas-orbiter/.preview-work/stage4-validation/stage4a-run-component.py
python3 /var/home/jedwards/kiedas-orbiter/.preview-work/stage4-validation/stage4a-stable-build.py
python3 /var/home/jedwards/kiedas-orbiter/.preview-work/stage4-validation/stage4a-run-stable.py
python3 /var/home/jedwards/kiedas-orbiter/.preview-work/stage4-validation/stage4a-app-boundary-build.py
python3 /var/home/jedwards/kiedas-orbiter/.preview-work/stage4-validation/stage4a-run-app-boundary.py
python3 /var/home/jedwards/kiedas-orbiter/.preview-work/stage4-validation/stage4a-frontend.py
python3 /var/home/jedwards/kiedas-orbiter/.preview-work/stage4-validation/stage4a-run-native-build.py
python3 /var/home/jedwards/kiedas-orbiter/.preview-work/stage4-validation/stage4a-run-native-bundle.py
python3 /var/home/jedwards/kiedas-orbiter/.preview-work/stage4-validation/prepare-stage4a-package-smokes.py
python3 /var/home/jedwards/kiedas-orbiter/.preview-work/stage4-validation/stage4a-run-package-smoke.py deb
python3 /var/home/jedwards/kiedas-orbiter/.preview-work/stage4-validation/stage4a-run-package-smoke.py appimage
python3 /var/home/jedwards/kiedas-orbiter/.preview-work/stage4-validation/stage4a-finalize.py
python3 /var/home/jedwards/kiedas-orbiter/.preview-work/stage4-validation/stage4a-postflight.py
```

The native wrappers use the hardened bounded-container helper, four CPUs, finite memory/time limits, offline/locked Cargo, `CARGO_BUILD_JOBS=4`, and `nice -n 19`. If an application-source defect, dependency need, or scope change appears during a rerun, stop before fixing it and obtain explicit approval under `AGENTS.md`. Test-harness/evidence-only corrections may be fixed and disclosed under the user's standing low-blast-radius rule.

## 12. Takeover warnings

1. Do not reconstruct the checkout from the cumulative patch and assume `Cargo.lock` came with it. The accepted lockfile is ignored and must be copied separately.
2. Do not treat the shared `.preview-work/ubuntu-build/target` as historical evidence. A later build will overwrite it; preserve artifacts first.
3. Do not use the earlier 101/101 package records as the final Stage 4A matrix. They are preserved under `before-native-all-route-matrix-*`; the final result is 141/141 per package.
4. Do not treat component fixtures as native proof. Package evidence and module-boundary evidence are separately labeled.
5. Do not claim Stable source is unchanged. Shared files changed, but Stable Dashboard output/callback behavior is verified exact and Stable route order is preserved.
6. Do not begin Farming Targets from the Dashboard's zero-state placeholder. Stage 4C requires its own approved source plan, real data model, standalone `node script.js` proof, property tests, and independently checkable real-data output.
7. Do not add AI-generated imagery. The user explicitly prohibits it throughout the application and mockups.

This handoff is the terminal action for the current Codex session. No Stage 4B file, plan implementation, build, or validation phase was started.
