/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// De app draait op https://jornevanhee93.github.io/krachtlog/, vandaar de base.
export default defineConfig({
  base: '/krachtlog/',
  plugins: [
    react(),
    VitePWA({
      // 'prompt': een nieuwe versie wordt pas actief als je op "Bijwerken" tikt.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Krachtlog',
        short_name: 'Krachtlog',
        description: 'Krachttraining plannen, uitvoeren en loggen',
        lang: 'nl',
        start_url: '/krachtlog/',
        scope: '/krachtlog/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1f6f5c',
        theme_color: '#1f6f5c',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Volledige app-shell in de cache, zodat de app offline opent.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
