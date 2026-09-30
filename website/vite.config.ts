import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { readDownloadCounts, recordDownload, type Browser } from './server/counter';

function downloadApi(): Plugin {
  return {
    name: 'locatorforge-download-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        if (!url.pathname.startsWith('/api/')) return next();

        res.setHeader('Cache-Control', 'no-store');

        if (url.pathname === '/api/downloads') {
          readDownloadCounts()
            .then((counts) => {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(counts));
            })
            .catch(() => {
              res.statusCode = 500;
              res.end('{}');
            });
          return;
        }

        if (url.pathname === '/api/download') {
          const browser = url.searchParams.get('browser');
          if (browser !== 'chrome' && browser !== 'edge') {
            res.statusCode = 400;
            res.end('unknown browser');
            return;
          }
          recordDownload(browser as Browser)
            .then((target) => {
              res.statusCode = 302;
              res.setHeader('Location', target);
              res.end();
            })
            .catch(() => {
              res.statusCode = 500;
              res.end();
            });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), downloadApi()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
