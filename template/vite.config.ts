import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // sia-storage loads its WASM via `new URL(..., import.meta.url)`; excluding
  // it from the deps pre-bundler keeps that URL pointing at the real file.
  optimizeDeps: { exclude: ['@siafoundation/sia-storage'] },
  // Without strictPort, Vite moves to the next free port when this one is
  // taken, and the Playwright baseURL can end up pointing at another app.
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
})
