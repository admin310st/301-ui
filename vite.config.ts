import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  // IMPORTANT: publicDir:'static' means files are served from root in both dev and prod
  // static/img/foo.svg → /img/foo.svg (NOT /static/img/foo.svg)
  // Build copies static/ → public/, Cloudflare Workers serves from public/
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
      '@i18n': '/src/i18n',
    },
  },
});
