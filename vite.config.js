import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves a project site from https://<user>.github.io/<repo>/, so
// production builds need that sub-path as the base. Dev stays at "/".
// Override with BASE_PATH=/ when building for a root-level host.
const base = process.env.BASE_PATH ?? (process.env.NODE_ENV === 'production' ? '/Warehouse-Management/' : '/')

export default defineConfig({
  base,
  plugins: [react()],
  server: { port: 5173, open: true },
})
