# Phase 2 cache design

This is a design only. It does not change the Preview app or make network
requests.

## Versioned layout

Use a cache root outside the bundled assets:

    data/export-cache/
      schema-v1/
        generations/
          <index-sha256>/
            manifest.json
            assets/<category-hash>.json
        active.json
        last-known-good.json
        downloads/

manifest.json records the DE index URL, retrieved time, index SHA-256,
resolved category URLs, content hashes, byte counts, record counts, schema
version, and validation results. The generation directory is immutable after
activation. The existing prototype cache at data/export remains separate
until this design is implemented and validated.

## Refresh and atomic activation

1. Read active.json and its manifest.
2. Fetch the DE index at most once per refresh attempt. Reuse any local asset
   whose resolved content hash is unchanged; do not redownload unchanged
   categories.
3. Download changed assets into a new generation directory using temporary
   siblings. Validate HTTP status, JSON shape, required categories, and
   count-collapse thresholds before activation.
4. Write and fsync the generation manifest, then atomically rename a temporary
   active pointer to active.json. Only after that, atomically update
   last-known-good.json.
5. Retain the previous generation until the new generation has passed one
   successful app load. Garbage collection is bounded and must never remove
   active or last-known-good.

The pointer contains only a generation ID and manifest hash, so readers never
observe a partially downloaded generation. A failed refresh leaves the active
pointer untouched.

## Rollback and offline behavior

If validation or app consumption fails, keep the failed generation quarantined,
restore active.json from last-known-good.json atomically, and report the
failure without deleting the prior data. If the network is unavailable, use
the active generation; if it is missing or invalid, use last-known-good. A
first-run offline launch should continue with bundled export assets and show
the data age/source state. No retry loop should run in the background.

## Cadence and politeness

Check the index once at startup and no more than once per 24 hours unless the
user explicitly invokes refresh. Category requests are sequential and at
least one second apart when more than one changed asset must be downloaded.
Hashes, ETags, or Last-Modified values should prevent unchanged downloads.
World-state and other higher-churn sources keep their existing separate
cadences; this cache is for DE Public Export assets only.

## App consumption

The implementation should touch only the Preview export path in
src-tauri/src/main.rs:

- resolve_path: add the cache root below the Preview data root.
- check_exports: replace age-only export downloads with index/hash
  resolution and generation validation; preserve locale and supplement
  boundaries.
- download_file: extend the temporary-file validation contract or introduce a
  cache-specific equivalent that validates before rename.
- write_bytes_atomic and write_json_atomic: reuse for generation files and
  pointer activation, adding directory/fsync handling where required.
- load_all_exports: resolve the active manifest's asset paths, then preserve
  the existing file-stem keys and locale merge key.
- load_txt_file: leave unchanged; TXT cadence is not part of this cache.
- refresh_vault_trader and refresh_glyph_supplement: leave separate from the
  DE generation because they have different authorities and cadences.

The frontend should continue receiving the same combined-export path from
load_all_exports. A later implementation must also update the startup
status/error text to distinguish active, last-known-good, bundled, and
offline sources. No Phase 2 code is included in this round.
