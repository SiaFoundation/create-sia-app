import { siaStorage } from '@siafoundation/sia-storage/vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // siaStorage() serves the SDK's service worker at /sia-storage-sw.js, which
  // downloads stream through. It also keeps Vite from pre-bundling the SDK,
  // which would break the URL the SDK loads its WebAssembly from.
  plugins: [react(), tailwindcss(), siaStorage()],
  // Without strictPort, Vite moves to the next free port when this one is
  // taken, and the Playwright baseURL can end up pointing at another app.
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
})
