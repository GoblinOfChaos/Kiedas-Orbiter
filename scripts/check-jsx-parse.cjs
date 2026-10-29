// Parse-check JSX files with the esbuild that ships with vite, so a syntax slip is caught before a build.
// Usage (from the Preview folder): node scripts/check-jsx-parse.cjs src/screens/Market.jsx src/screens/Mods.jsx
const fs = require('fs')
const path = require('path')
const { createRequire } = require('module')

const root = path.resolve(__dirname, '..')
const viteEntry = createRequire(path.join(root, 'package.json')).resolve('vite')
const esbuild = createRequire(viteEntry)('esbuild')

let failed = false
for (const file of process.argv.slice(2)) {
  try {
    esbuild.transformSync(fs.readFileSync(path.join(root, file), 'utf8'), { loader: 'jsx' })
    console.log('parses:', file)
  } catch (error) {
    failed = true
    console.log('PARSE ERROR in', file, '\n', String(error.message).slice(0, 500))
  }
}
process.exit(failed ? 1 : 0)
