import { defineConfig, Plugin } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Custom plugin to handle partials
function partialsPlugin(): Plugin {
  const partials = new Map<string, string>();

  // Load partials
  const loadPartial = (name: string) => {
    if (!partials.has(name)) {
      const content = readFileSync(resolve(__dirname, `partials/${name}.hbs`), 'utf-8');
      partials.set(name, content);
    }
    return partials.get(name)!;
  };

  return {
    name: 'vite-plugin-partials',
    transformIndexHtml(html) {
      // Replace partial includes
      let result = html;

      // Replace {{> partial-name}}
      result = result.replace(/\{\{>\s*(\S+)\s*\}\}/g, (match, partial) => {
        return loadPartial(partial);
      });

      // Replace {{> sidebar activePage="value"}}
      result = result.replace(/\{\{>\s*sidebar\s+activePage="(\w+)"\s*\}\}/g, (match, activePage) => {
        const sidebarHtml = loadPartial('sidebar');
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
  plugins: [partialsPlugin()],
  build: {
    outDir: 'public',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        wizard: resolve(__dirname, 'wizard.html'),
        integrations: resolve(__dirname, 'integrations.html'),
        account: resolve(__dirname, 'account.html'),
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
      '@utils': '/src/utils',
      '@state': '/src/state',
      '@social': '/src/social',
      '@i18n': '/src/i18n',
    },
  },
});
