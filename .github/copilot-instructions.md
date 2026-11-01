# Copilot coding agent — repository instructions

## Read this before changing anything

This is the **Preview** app repo. It is self-contained: it has its own `package.json`,
`pnpm-lock.yaml`, `node_modules`, and `src-tauri/`. All app work happens here.

There is a **separate root repo** one level up (`../../`) that holds docs, rules, and
scratch data. Do **not** edit files outside this repo's own tree, and do not commit to
the root repo from here.

## Stack

- Frontend: React 18 + Vite + Tailwind (`src/`)
- Backend: Tauri 2 + Rust (`src-tauri/`)
- Build: `pnpm run preview:build` (throttled; sets `CARGO_BUILD_JOBS=4`, `nice -n 19`)

## Hard rules (from AGENTS.md)

1. **CPU protection** — every Rust/Cargo build uses `CARGO_BUILD_JOBS=4` and
   `nice -n 19`. No unthrottled loops or aggressive polling.
2. **Primary sources only** — game data comes only from DE WorldState
   (`https://api.warframe.com/cdn/worldState.php`), DE PublicExport
   (`https://content.warframe.com/PublicExport/`), and the official wiki
   (`https://wiki.warframe.com/`). The Fandom wiki is banned. Never invent IDs,
   formulas, or mechanics. The player's `inventory.json` is the ground truth for
   owned items.
3. **Public text** — commit messages and PR text must be factual: no AI/tool/model
   names, no `Co-authored-by` trailers, no references to the user or owner. A
   `commit-msg` hook enforces this.

## Verifying changes

- Frontend: `node scripts/audit_static.js` and `npx eslint src`
- Rust: `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets`
- CI runs both on every push to `preview/stage4` (see `.github/workflows/ci.yml`).

## Do NOT

- Do not run a plain `pnpm tauri build` or `cargo build` for deployment — that produces
  a binary without the `IS_PREVIEW` flag. Use `pnpm run preview:build`.
- Do not build AppImages outside the `kiedas-orbiter` distrobox (glibc 2.35).
- Do not force-push or rewrite `preview/stage4` history.
