import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  // IMPORTANT: publicDir: 'static' => files are served from **root** in dev & prod.
  // Example: static/img/foo.svg -> /img/foo.svg  (NOT /static/img/foo.svg)
  publicDir: 'static',
  base: '/',
  build: {
    outDir: 'public',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        wizard: resolve(__dirname, 'wizard.html'),
      },
    },
  },
  server: {
    port: 5173,
  },
  resolve: {
    alias: {
      '@api': '/src/api',
      '@forms': '/src/forms',
      '@ui': '/src/ui',
      '@utils': '/src/utils',
      '@state': '/src/state',
      '@social': '/src/social',
      '@i18n': '/src/i18n',
    },
  },
});
