import { defineConfig, Plugin } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { visualizer } from 'rollup-plugin-visualizer';

// Custom plugin to handle partials
function partialsPlugin(): Plugin {
  const partials = new Map<string, string>();

  // Load partials (always read fresh in dev mode)
  const loadPartial = (name: string, isDev: boolean) => {
    if (isDev || !partials.has(name)) {
      const content = readFileSync(resolve(__dirname, `partials/${name}.hbs`), 'utf-8');
      partials.set(name, content);
    }
    return partials.get(name)!;
  };

  return {
    name: 'vite-plugin-partials',
    configureServer(server) {
      // Watch partials directory and trigger HMR
      server.watcher.add('partials/**/*.hbs');
      server.watcher.on('change', (file) => {
        if (file.includes('partials')) {
          partials.clear();
          server.ws.send({ type: 'full-reload' });
        }
      });
    },
    transformIndexHtml(html, ctx) {
      const isDev = ctx.server !== undefined;
      // Replace partial includes
      let result = html;

      // Replace {{> partial-name}}
      result = result.replace(/\{\{>\s*(\S+)\s*\}\}/g, (match, partial) => {
        return loadPartial(partial, isDev);
      });

      // Replace {{> sidebar activePage="value"}}
      result = result.replace(/\{\{>\s*sidebar\s+activePage="(\w+)"\s*\}\}/g, (match, activePage) => {
        const sidebarHtml = loadPartial('sidebar', isDev);
        // Replace handlebars conditionals with actual values
        return sidebarHtml.replace(/\{\{#if \(eq activePage '(\w+)'\)\}\} is-active\{\{\/if\}\}/g, (m, page) => {
          return page === activePage ? ' is-active' : '';
        });
      });

      return result;
    },
  };
}

export default defineConfig({
  root: '.',
  // IMPORTANT: publicDir: 'static' => files are served from **root** in dev & prod.
  // Example: static/img/foo.svg -> /img/foo.svg  (NOT /static/img/foo.svg)
  publicDir: 'static',
  base: '/',
  appType: 'mpa',
  plugins: [
    partialsPlugin(),
    visualizer({
      filename: 'build/bundle-stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    outDir: 'public',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        integrations: resolve(__dirname, 'integrations.html'),
        account: resolve(__dirname, 'account.html'),
        domains: resolve(__dirname, 'domains.html'),
        redirects: resolve(__dirname, 'redirects.html'),
        streams: resolve(__dirname, 'streams.html'),
        guide: resolve(__dirname, 'ui-style-guide.html'),
        about: resolve(__dirname, 'about.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        terms: resolve(__dirname, 'terms.html'),
        security: resolve(__dirname, 'security.html'),
        docs: resolve(__dirname, 'docs.html'),
        notFound: resolve(__dirname, '404.html'),
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
      '@domains': '/src/domains',
      '@redirects': '/src/redirects',
      '@utils': '/src/utils',
      '@state': '/src/state',
      '@social': '/src/social',
      '@i18n': '/src/i18n',
    },
  },
});
