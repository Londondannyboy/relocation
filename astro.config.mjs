// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://relocation.quest',
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  integrations: [tailwind(), react()],
  redirects: {
    '/relocation/guide/latvia-startup-visa-complete-guide-2025': '/latvia-startup-visa-complete-guide-2025',
    '/sitemap.xml': '/api/sitemap.xml'
  },
  server: {
    host: true // Listen on all network interfaces (0.0.0.0)
  },
  vite: {
    ssr: {
      // Exclude Node.js-only packages from SSR bundling
      noExternal: [],
      external: ['hume']
    },
    optimizeDeps: {
      // Exclude server-only packages from client-side bundling
      exclude: ['hume', '@getzep/zep-cloud']
    },
    build: {
      rollupOptions: {
        external: ['hume', 'stream', 'fs', 'path']
      }
    }
  }
});
