import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  // Allow JSON imports (needed for warframe-public-export-plus/dict.en.json)
  json: { stringify: false },
  clearScreen: false,
  publicDir: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**"] },
    // This tree's node_modules is a symlink to the parent repo's real
    // node_modules (Preview is a nested checkout with its own .git and
    // lockfile, not its own package). Vite's dev-server fs guard checks the
    // resolved real path against its allowlist, which defaults to just this
    // subdirectory - so anything served from the parent's node_modules
    // (fonts, etc.) 403'd. Vite's own searchForWorkspaceRoot() can't find the
    // parent automatically because this subdirectory's own .git/lockfile
    // make it look like a self-contained root, so the parent is named
    // explicitly here instead.
    fs: { allow: [path.resolve(__dirname, '../..')] },
  },
  build: {
    target: 'es2022',
  },
})