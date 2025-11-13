// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  site: 'https://relocation.quest',
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  integrations: [tailwind()],
  server: {
    host: true // Listen on all network interfaces (0.0.0.0)
  },
  vite: {
    ssr: {
      // Exclude Node.js-only packages from being processed for client
      noExternal: []
    },
    optimizeDeps: {
      // Exclude hume and related packages from client-side bundling
      exclude: ['hume', '@humeai/voice-react', '@getzep/zep-cloud']
    }
  }
});
