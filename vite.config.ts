import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'static',
  build: {
    outDir: 'public',
    emptyOutDir: true,
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
    },
  },
});
