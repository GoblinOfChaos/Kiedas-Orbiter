import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Build stamp shown in the Preview sidebar so it is always clear which build is running.
function buildId() {
  let commit = 'unknown'
  try { commit = execSync('git rev-parse --short HEAD', { cwd: __dirname, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { /* git missing or refuses this directory (distrobox ownership): read .git directly */ }
  if (commit === 'unknown') {
    try {
      const head = readFileSync(path.join(__dirname, '.git/HEAD'), 'utf8').trim()
      let ref = head
      if (head.startsWith('ref: ')) {
        const refName = head.slice(5)
        try { ref = readFileSync(path.join(__dirname, '.git', refName), 'utf8').trim() } catch {
          // the branch ref was packed (git gc / push): look it up in packed-refs
          const packed = readFileSync(path.join(__dirname, '.git/packed-refs'), 'utf8').split('\n').find((line) => line.endsWith(` ${refName}`))
          ref = packed ? packed.split(' ')[0] : 'unknown'
        }
      }
      commit = ref.slice(0, 7)
    } catch { /* leave unknown */ }
  }
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