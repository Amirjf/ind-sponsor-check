import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.config.ts'

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  server: {
    cors: { origin: [/chrome-extension:\/\//] },
  },
  build: {
    emptyOutDir: true,
    rollupOptions: {
      // Extension pages not referenced by the manifest must be listed here.
      input: { intro: 'src/intro/index.html' },
    },
    // the bundled register snapshot lives in the service worker chunk
    chunkSizeWarningLimit: 1000,
  },
})
