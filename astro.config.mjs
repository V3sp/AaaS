// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// Architect as a Service runs on-demand (SSR) because /api/ask answers POST requests.
// `standalone` mode emits a self-contained server (dist/server/entry.mjs) that we run in Docker.
// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  server: {
    host: true,
    port: Number(process.env.PORT) || 4321,
  },
});
