/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      // The app shell (HTML, JS, CSS, fonts, icons) works offline. API calls are never cached:
      // nutrition answers must come from the live engine or the labelled demo adapter.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Low data: precache only the Latin and Bangla font subsets the app shows. Other subsets
        // (and the .woff fallbacks) still load on demand through the CSS unicode-range rules.
        globIgnores: ['**/*-cyrillic*', '**/*-greek*', '**/*-vietnamese*', '**/*-latin-ext*', '**/*.woff'],
        navigateFallback: 'index.html',
        runtimeCaching: [],
      },
      manifest: {
        name: 'EdiByte',
        short_name: 'EdiByte',
        description: 'Is this meal right for me? Nutrition guidance for Bangladeshi teens.',
        lang: 'bn',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#FBFAF5',
        theme_color: '#4F6B2A',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  // The demo adapter imports backend/data/reference_targets.csv (single source of truth).
  server: { fs: { allow: ['..'] } },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
