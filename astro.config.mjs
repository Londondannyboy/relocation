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
    '/relocation/guide/latvia-startup-visa-complete-guide-2025': '/latvia-startup-visa-complete-guide-2025'
  },
  server: {
    host: true // Listen on all network interfaces (0.0.0.0)
  },
  vite: {
    ssr: {
      // Handle SSR bundling
      noExternal: ['@humeai/voice-react'],
      external: ['hume']
    },
    resolve: {
      alias: {
        // Polyfill Node.js stream for browser
        'stream': 'stream-browserify'
      }
    },
    optimizeDeps: {
      // Exclude server-only packages from client-side bundling
      exclude: ['@getzep/zep-cloud', 'hume']
    },
    build: {
      rollupOptions: {
        // Externalize Node.js built-ins that hume tries to use
        external: ['stream', 'fs', 'path']
      }
    }
  }
});
