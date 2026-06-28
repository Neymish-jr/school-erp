import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sharedRolesPath = path.resolve(__dirname, '../shared/constants/roles.js')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Force shared CommonJS roles through dep pre-bundling (ESM interop for dev).
      '@schoolerp/shared/roles': sharedRolesPath,
    },
  },
  optimizeDeps: {
    include: ['@schoolerp/shared/roles'],
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
  },
})
