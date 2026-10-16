import { defineConfig } from '@playwright/test';

// End-to-endtests op een telefoonscherm (375 × 812), in licht en donker.
// Draait tegen de productiebuild (npm run build) via vite preview.
// In de cloudomgeving staat Chromium al klaar; lokaal kan PW_CHROMIUM naar een andere Chrome wijzen.
const executablePath = process.env.PW_CHROMIUM ?? '/opt/pw-browsers/chromium';

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  workers: 1,
  use: {
    baseURL: 'http://localhost:4173/krachtlog/',
    viewport: { width: 375, height: 812 },
    hasTouch: true,
    isMobile: true,
    launchOptions: { executablePath },
  },
  projects: [
    { name: 'licht', use: { colorScheme: 'light' } },
    { name: 'donker', use: { colorScheme: 'dark' } },
  ],
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/krachtlog/',
    reuseExistingServer: true,
  },
});
