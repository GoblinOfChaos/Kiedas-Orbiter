import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

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
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('warframe-items') && id.endsWith('.json')) {
            return 'wi-data'
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      'warframe-items-data': path.resolve(__dirname, 'node_modules/warframe-items/data/json'),
    },
  },
})