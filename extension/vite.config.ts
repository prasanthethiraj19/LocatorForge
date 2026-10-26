import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { getVersion } from '../scripts/version.mjs';

export default defineConfig({
  plugins: [react()],
  // Version is resolved at build time (scripts/version.mjs) so the packaged zip
  // and the panel footer always agree with the build that produced them.
  define: {
    __APP_VERSION__: JSON.stringify(getVersion()),
  },
  // static assets (manifest, html, icons) are copied by scripts/build.mjs
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    target: 'chrome116',
    minify: 'esbuild',
    sourcemap: false,
    // Chrome 116+ has native modulepreload; the injected polyfill triggers
    // "cross-world extension resource mismatch" warnings in extension pages.
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: {
        devtools: resolve(__dirname, 'src/devtools/devtools.html'),
        panel: resolve(__dirname, 'src/panel/panel.html'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
