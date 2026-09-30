import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { GET, POST } from '../api/stats';

function statsApi(): Plugin {
  return {
    name: 'locatorforge-stats-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        if (url.pathname !== '/api/stats') return next();

        const handler = req.method === 'POST' ? POST : GET;

        handler(new Request(url))
          .then(async (response) => {
            res.statusCode = response.status;
            response.headers.forEach((value, key) => res.setHeader(key, value));
            res.end(await response.text());
          })
          .catch(() => {
            res.statusCode = 500;
            res.end('{}');
          });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), statsApi()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
