import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    rollupOptions: {
      output: {
        // Keep the chart library out of the first-load bundle.
        manualChunks: (id) => (id.includes('recharts') || id.includes('d3-') ? 'charts' : undefined),
      },
    },
  },
})
