/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// De app (Emerge) draait op https://jornevanhee93.github.io/krachtlog/, vandaar de base.
// De link en de databasenaam blijven 'krachtlog', zodat bestaande installaties en data blijven werken.
// Korte commit-id, zichtbaar op het Data-scherm (zo zie je welke versie draait).
function versie(): string {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'dev';
  }
}

export default defineConfig({
  base: '/krachtlog/',
  define: {
    __APP_VERSIE__: JSON.stringify(versie()),
  },
  plugins: [
    react(),
    VitePWA({
      // 'prompt': een nieuwe versie wordt pas actief als je op "Bijwerken" tikt.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Emerge',
        short_name: 'Emerge',
        description: 'Krachttraining plannen, uitvoeren en loggen',
        lang: 'nl',
        start_url: '/krachtlog/',
        scope: '/krachtlog/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#000000',
        theme_color: '#000000',
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
  build: {
    // Eén bundel is prima voor een offline-app.
    chunkSizeWarningLimit: 800,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
