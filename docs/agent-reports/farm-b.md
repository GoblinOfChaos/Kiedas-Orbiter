# farm-b implementation plan

1. Replace the Rust wiki-store refresh/decompression/hash implementation with
   two raw-read commands: index and indexed compressed bytes, using the live
   data-root store before the bundled resource fallback.
2. Register only those commands in `main.rs`.
3. Move gzip decompression and SHA-256 verification into the injected webview
   client defaults, retaining title lookup, memoisation, JSON/Lua decoding, and
   the 24-hour `generatedAt` staleness rule.
4. Update client tests to use real gzip fixtures and cover hash mismatch,
   corrupt gzip, memoisation, unknown title, and staleness.
5. Run only non-compiling static checks and the requested Node test command;
   record exact results in `AGENT_REPORT.md`.

# farm-b Task 3/4 report

## Fix round

Implemented the coordinator-approved data-channel boundary. Rust now exposes
only `wiki_store_index` and `wiki_store_get_bytes`; it reads a live
`data/wiki-store` index first, falls back to the bundled `data/assets/wiki-store`
via `resolve_bundled_path`, and returns only raw bytes for filenames exactly
listed in `index.json`. It performs no network access, decompression, hashing,
or subprocess execution. The webview client now uses `DecompressionStream` and
`crypto.subtle`, verifies compressed-byte SHA-256 before decoding, memoises by
title, and reports title-specific hash/gzip failures. The refresh test/path was
removed and the tests use `node:zlib` gzip fixtures.

## Task 3: wiki store builder

Built `scripts/wiki-store/build.mjs` and `scripts/wiki-store/fetch-revisions.mjs`. The builder unions Lua and JSON inputs, prefers JSON, validates JSON modules, sorts by title, records revision metadata and SHA-256, and always writes gzip level 6 module files with `encoding: "gzip"`. The fetcher preserves MediaWiki titles, batches 50 titles per request, and sleeps 1200 ms between requests.

The failing test was run first and failed with the expected missing-module `ERR_MODULE_NOT_FOUND`. After implementation:

`nice -n 19 node --test tests/farming/wikiStoreBuild.test.mjs` -> 2 tests, 2 pass, 0 fail.

Real run: `nice -n 19 node scripts/wiki-store/fetch-revisions.mjs /home/jedwards/kiedas-orbiter/wiki_module_archive wiki_revisions.json` fetched 493/493 revisions in 10 batches. The revision file was removed after building because the external archive is read-only and no generated input belongs at the worktree root. The build command used the external archive/JSON directories as read-only inputs and wrote `src-tauri/data/assets/wiki-store`.

Result: 531 modules, 8,782,880 compressed module bytes, approximately 11M including `index.json`. Source directories measured 28M (Lua archive) and 80M (JSON source). Three underscore-prefixed JSON metadata files were excluded after inspection (`_all_643_titles.json`, `_145_data_titles.json`, `_logic_module_titles.json`); otherwise they produced invalid `Module:/...` identities.

## Task 4: runtime and JS client

Added `src/lib/wikiStore.js` with injected `invoke`, lazy index loading, per-title memoization, clear unknown-title errors, JSON/Lua data normalization, and 24-hour staleness detection. Added `src-tauri/src/wiki_store.rs`, registered its three commands in `main.rs`, and exposed safe index/get/atomic refresh behavior. The Rust module was formatted with edition 2021 but intentionally not compiled.

The failing client test was run first and failed with the expected missing-module `ERR_MODULE_NOT_FOUND`. Final combined run:

`nice -n 19 node --test tests/farming/wikiStoreBuild.test.mjs tests/farming/wikiStoreClient.test.mjs` -> 5 tests, 5 pass, 0 fail.

Other checks: `node --check` passed for both scripts and the JS client; `rustfmt --edition 2021 --check src-tauri/src/wiki_store.rs` passed; `git diff --check` passed. No build, Cargo, Tauri, Vite, npm, or pnpm command ran.

## Open questions / follow-ups

- Rust gzip and SHA-256 currently invoke host `gzip` and `sha256sum`; this needs coordinator review for Windows/macOS portability and dependency policy.
- The Rust interface has no `force` parameter despite the plan's 24-hour/force requirement; current behavior honors the 24-hour check only.
- The referenced `docs/revamp/stage-4/COMMAND-CENTER-IMPLEMENTATION-PLAN.md` §9.8 file was absent from this worktree.
- Rust compilation and live Tauri command testing remain coordinator work.

## Files created/modified

- Created: `scripts/wiki-store/build.mjs`, `scripts/wiki-store/fetch-revisions.mjs`, `src-tauri/src/wiki_store.rs`, `src/lib/wikiStore.js`, `tests/farming/wikiStoreBuild.test.mjs`, `tests/farming/wikiStoreClient.test.mjs`, `src-tauri/data/assets/wiki-store/*`.
- Modified: `src-tauri/src/main.rs`.
