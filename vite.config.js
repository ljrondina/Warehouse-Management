import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves a project site from https://<user>.github.io/<repo>/, so
// production builds need that sub-path as the base. Dev stays at "/".
// Override with BASE_PATH=/ when building for a root-level host.
// Must match the REPOSITORY NAME exactly: the site is served from
// https://prcdepartment.github.io/prc-wh/, so every asset URL needs that prefix.
// Rename the repo and this must change with it, or the page loads blank.
const base = process.env.BASE_PATH ?? (process.env.NODE_ENV === 'production' ? '/prc-wh/' : '/')

export default defineConfig({
  base,
  plugins: [react()],
  server: { port: 5173, open: true },
})
