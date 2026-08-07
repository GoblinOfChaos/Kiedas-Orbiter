# Kieda's Orbiter Fork Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fork Cephalon Kronos into a new, independently-owned repo named "Kieda's Orbiter" — rebranded, attributed, and verified to build on Windows and Linux — as the foundation the four feature plans (Relic Planner, collectibles+locations, relic-overlay need-sort, stat-based riven grading) will build on next.

**Architecture:** `git clone` the existing local `cephalon-kronos` checkout into a new repo directory, rename every user-visible and machine identifier from "Cephalon Kronos" / `cephalon-kronos` / `com.glowseeker.cephalonkronos` to "Kieda's Orbiter" / `kiedas-orbiter` / a new identifier, add attribution surfaces (About screen, README, LICENSE untouched), swap the icon, and confirm `pnpm tauri build` still succeeds on both Linux and the existing Windows VM test setup before any feature work starts.

**Tech Stack:** Rust (Tauri 2), React 18 + Vite, pnpm, existing Kronos build toolchain (`pnpm tauri build`, `build:appimage` script).

## Global Constraints

- MIT + Commons Clause license (from `/var/home/jedwards/cephalon-kronos/LICENSE`) must be preserved verbatim in the new repo; Commons Clause applies only to the bundled `warframe-api-helper` binary (blocks selling), rest of the app is plain MIT.
- Visible attribution required: About/Credits screen and README must credit glowseeker / Cephalon Kronos as the base project, with a link to https://github.com/glowseeker/cephalon-kronos.
- New app name is **Kieda's Orbiter** everywhere it's user-visible (window titles, package name, product name, About screen, README) and in the new app identifier/slug (`kiedas-orbiter` / `com.jacob.kiedasorbiter` or similar — confirmed in Task 1).
- Must build and run on every platform Kronos currently supports: Windows and Linux confirmed in this plan (macOS is untested upstream too, so out of scope for verification here, but nothing in this plan may add a Linux-only or Windows-only dependency).
- No feature work (Relic Planner, collectibles, need-sort, riven grading) happens in this plan — those are separate follow-up plans once this foundation is verified working.

---

### Task 1: Fork the repo and choose identifiers

**Files:**
- Create: new repo directory (path decided by Jacob during this task, e.g. `/var/home/jedwards/kiedas-orbiter`)

**Interfaces:**
- Produces: the repo root path and chosen identifiers (`productName`, npm `name`, Cargo `name`, Tauri `identifier`) that every later task in this plan and all follow-up feature plans will reference.

- [ ] **Step 1: Confirm the new repo location and identifiers with Jacob**

Ask directly (do not assume): where should the new repo live on disk, and does he want a GitHub remote created now or later. Propose these defaults for confirmation:
- Directory: `/var/home/jedwards/kiedas-orbiter`
- npm/Cargo `name`: `kiedas-orbiter`
- Tauri `identifier`: `com.jacob.kiedasorbiter`
- `productName`: `Kieda's Orbiter`

- [ ] **Step 2: Clone the existing checkout as the new repo**

```bash
git clone /var/home/jedwards/cephalon-kronos /var/home/jedwards/kiedas-orbiter
cd /var/home/jedwards/kiedas-orbiter
git remote remove origin
```

This detaches the new repo from glowseeker's remote so nothing is accidentally pushed upstream. A new `origin` is added later only if/when Jacob confirms a GitHub destination.

- [ ] **Step 3: Verify the clone is intact**

```bash
cd /var/home/jedwards/kiedas-orbiter
git log --oneline -5
git status
```

Expected: same commit history as `cephalon-kronos`, clean working tree.

- [ ] **Step 4: Commit nothing yet — this task only establishes the repo**

No commit needed; Task 2 makes the first rebrand commit.

---

### Task 2: Rebrand Tauri config, package manifests, and app identifier

**Files:**
- Modify: `src-tauri/tauri.conf.json` (`productName`, `identifier`, all `title` fields under `app.windows`)
- Modify: `package.json` (`name`)
- Modify: `src-tauri/Cargo.toml` (`name` under `[package]`)

**Interfaces:**
- Consumes: identifiers chosen in Task 1 Step 1.
- Produces: `productName: "Kieda's Orbiter"`, package/crate name `kiedas-orbiter`, identifier `com.jacob.kiedasorbiter` — later tasks (icon, About screen, README) reference these same strings.

- [ ] **Step 1: Update `src-tauri/tauri.conf.json`**

Change:
```json
"productName": "Cephalon Kronos",
"identifier": "com.glowseeker.cephalonkronos",
```
to:
```json
"productName": "Kieda's Orbiter",
"identifier": "com.jacob.kiedasorbiter",
```

Then update every `"title"` field under `app.windows` (main window is `"Cephalon Kronos"`, overlay windows are `"Cephalon Kronos Notification"` etc — there are multiple window entries) — replace `"Cephalon Kronos"` with `"Kieda's Orbiter"` in each, keeping the rest of each title string (e.g. `"Cephalon Kronos Notification"` → `"Kieda's Orbiter Notification"`). Read the full `app.windows` array first to catch every occurrence.

- [ ] **Step 2: Update `package.json`**

Change:
```json
"name": "cephalon-kronos",
```
to:
```json
"name": "kiedas-orbiter",
```

- [ ] **Step 3: Update `src-tauri/Cargo.toml`**

Change the `name` field under `[package]` from `cephalon-kronos` to `kiedas-orbiter`.

- [ ] **Step 4: Verify no leftover old identifier in these three files**

```bash
grep -n "Cephalon Kronos\|cephalon-kronos\|cephalonkronos\|glowseeker" src-tauri/tauri.conf.json package.json src-tauri/Cargo.toml
```

Expected: no output (all replaced). If anything remains, fix it before continuing.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/tauri.conf.json package.json src-tauri/Cargo.toml
git commit -m "Rebrand app identifiers to Kieda's Orbiter"
```

---

### Task 3: Swap the app icon

**Files:**
- Replace: `src-tauri/icons/IconKronos.png`, `src-tauri/icons/icon.png`, `src-tauri/icons/icon.ico`, `src-tauri/icons/icon.icns`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: new icon files at the same paths Tauri's bundler already expects (paths unchanged, only content swapped), so no config changes are needed here beyond what Task 2 already did.

- [ ] **Step 1: Get the new icon asset from Jacob**

Ask directly: does he have new artwork ready (a square PNG, ideally 1024x1024), or does he want a placeholder for now that gets swapped later. Do not generate or guess an icon — this is a visual/branding decision that belongs to him.

- [ ] **Step 2: Generate the platform-specific formats from the source PNG**

Tauri ships an icon-generation command for exactly this:

```bash
cd /var/home/jedwards/kiedas-orbiter
pnpm tauri icon path/to/new-source-icon.png
```

This regenerates everything under `src-tauri/icons/` (including `icon.png`, `icon.ico`, `icon.icns`, and the sized variants) from the one source file. Confirm the command completes without error.

- [ ] **Step 3: Rename or remove the old `IconKronos.png` if it's no longer referenced**

```bash
grep -rn "IconKronos" src-tauri/tauri.conf.json src/ 2>/dev/null
```

If nothing references it, delete it:
```bash
git rm src-tauri/icons/IconKronos.png
```
If something does reference it (e.g. an in-app About screen image), note the reference for Task 4 and rename the file there instead of deleting it.

- [ ] **Step 4: Commit**

```bash
git add -A src-tauri/icons/
git commit -m "Replace app icon with Kieda's Orbiter branding"
```

---

### Task 4: Add attribution — About screen and README

**Files:**
- Modify: `src/screens/About.jsx`
- Modify: `README.md`
- Do not modify: `LICENSE` (must stay byte-identical to preserve the MIT + Commons Clause terms and glowseeker's copyright notice)

**Interfaces:**
- Consumes: nothing from earlier tasks besides the confirmed app name.
- Produces: nothing consumed by later tasks — this is a leaf/UI task.

- [ ] **Step 1: Read the current About.jsx to find where app name/version are rendered**

```bash
cat src/screens/About.jsx
```

Identify where `"Cephalon Kronos"` (or the `productName` it may pull from Tauri's app metadata API) is displayed, and where third-party credits, if any, are already listed.

- [ ] **Step 2: Update the displayed app name and add a base-project credit block**

Replace any hardcoded `"Cephalon Kronos"` text with `"Kieda's Orbiter"`. Add a visible credit section (exact JSX depends on the file's existing structure — match its component/styling conventions) containing this text, verbatim:

> Kieda's Orbiter is a fork of [Cephalon Kronos](https://github.com/glowseeker/cephalon-kronos) by glowseeker, used under the MIT License (with a Commons Clause restriction on the bundled warframe-api-helper binary). See LICENSE for full terms.

- [ ] **Step 3: Update README.md**

Replace the title (`# Cephalon Kronos`) with `# Kieda's Orbiter`, and every other `"Cephalon Kronos"` / `cephalon-kronos` reference in the file with the new name, **except** inside a new top-of-file attribution note. Add this note directly under the title, before the badges:

```markdown
> Kieda's Orbiter is a fork of [Cephalon Kronos](https://github.com/glowseeker/cephalon-kronos)
> by glowseeker, used under the MIT License (Commons Clause applies only to the
> bundled warframe-api-helper binary — see [LICENSE](./LICENSE)).
```

Update the GitHub badge URLs (release/downloads/stars) — leave them pointing at `glowseeker/cephalon-kronos` for now since there's no new GitHub repo yet (revisit once Task 1's remote decision is made), but add an inline comment noting they'll need updating once a `kiedas-orbiter` remote exists.

- [ ] **Step 4: Verify LICENSE is unchanged**

```bash
git diff --stat LICENSE
```

Expected: no output (file untouched).

- [ ] **Step 5: Commit**

```bash
git add src/screens/About.jsx README.md
git commit -m "Add Kieda's Orbiter branding and Cephalon Kronos attribution"
```

---

### Task 5: Verify Linux build

**Files:**
- None modified — this task only runs and confirms existing build tooling.

**Interfaces:**
- Consumes: everything from Tasks 1–4 (renamed identifiers, new icon, attribution).
- Produces: a working Linux build, confirming the rebrand didn't break anything, before the Windows check in Task 6.

- [ ] **Step 1: Install dependencies fresh**

```bash
cd /var/home/jedwards/kiedas-orbiter
pnpm install
```

Expected: completes without error.

- [ ] **Step 2: Run the dev build to catch fast feedback issues first**

```bash
pnpm tauri dev
```

Expected: app window opens showing "Kieda's Orbiter" as the title (check the OS window decoration/taskbar, not just in-app text), with the new icon visible in the window/taskbar. Close it once confirmed (Ctrl+C in the terminal).

- [ ] **Step 3: Run the full production build**

```bash
pnpm tauri build
```

Expected: completes without error, producing a bundle under `src-tauri/target/release/bundle/`.

- [ ] **Step 4: Launch the built binary and confirm branding end-to-end**

```bash
find src-tauri/target/release/bundle -maxdepth 2 -type f -executable
```
Run the located binary directly, confirm: window title is "Kieda's Orbiter", icon matches Task 3's asset, About screen (Task 4) shows the new name and the Cephalon Kronos attribution note.

- [ ] **Step 5: Commit only if Step 1–4 required any fixes**

If everything passed with no code changes needed, there's nothing to commit here — this task is a verification gate, not a code change. If any fix was needed, commit it with a message describing what broke and why.

---

### Task 6: Verify Windows build

**Files:**
- None modified — this task only runs and confirms existing build tooling on Windows.

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces: confirmation that the rebranded fork satisfies the plan's cross-platform requirement before any feature work begins.

- [ ] **Step 1: Get the renamed repo onto the Windows VM**

Using Jacob's existing test setup (git clone at `C:\Users\jacob\Documents\Kiedas-Orbiter`, per his established Windows VM workflow — not OneDrive), pull the new repo there:

```bash
git clone /var/home/jedwards/kiedas-orbiter <path Jacob confirms on the VM>
```

Ask Jacob to confirm the exact path and whether he wants to do the transfer himself or have it pushed to a location he can pull from on the VM (this repo doesn't have a GitHub remote yet per Task 1 — coordinate transfer method with him first).

- [ ] **Step 2: Install prerequisites on Windows if not already present**

Confirm with Jacob whether Rust, Node.js/pnpm, and the Tauri Windows prerequisites (Microsoft C++ Build Tools, WebView2) are already installed from prior wfinfo-ng work, or need installing now.

- [ ] **Step 3: Run the same install/build sequence as Task 5**

```powershell
pnpm install
pnpm tauri build
```

Expected: completes without error, producing a Windows installer/bundle under `src-tauri\target\release\bundle\`.

- [ ] **Step 4: Launch the built app on Windows and confirm branding**

Run the installed/built executable, confirm: window title is "Kieda's Orbiter", correct icon, About screen shows the attribution note from Task 4.

- [ ] **Step 5: Report result back and commit any Windows-specific fix**

If the Windows build needed a code change (e.g. a path or platform-conditional issue), make that fix in the Linux checkout, re-verify Linux still builds (re-run Task 5 Step 3), then commit:

```bash
git add -A
git commit -m "Fix Windows build issue found during cross-platform verification"
```

If no fix was needed, this task closes with no commit — verification-only.

---

## Self-review notes

- **Spec coverage:** Fork (Task 1) ✓, rebrand name/icon/identifiers (Tasks 2–3) ✓, attribution (Task 4) ✓, cross-platform Linux+Windows verification (Tasks 5–6) ✓. The spec's four feature additions (Relic Planner, collectibles+locations, relic-overlay need-sort, stat-based riven grading) are intentionally **not** in this plan — per the writing-plans scope-check rule, each is an independent subsystem and gets its own follow-up plan once this foundation is confirmed working, since their exact file paths depend on the renamed repo this plan produces.
- **macOS:** the spec notes Kronos's macOS support is untested even upstream; this plan does not add a macOS verification task since Jacob has no Mac test environment (per his documented Windows VM + Linux setup) — flagged here rather than silently dropped.
