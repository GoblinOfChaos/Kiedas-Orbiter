import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Build stamp shown in the Preview sidebar so it is always clear which build is running.
function buildId() {
  let commit = 'unknown'
  try { commit = execSync('git rev-parse --short HEAD', { cwd: __dirname, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { /* not a git checkout */ }
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${commit} ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default defineConfig({
  define: { __KIEDA_BUILD_ID__: JSON.stringify(buildId()) },
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