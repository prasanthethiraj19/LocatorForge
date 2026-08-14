import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    target: 'chrome116',
    minify: 'esbuild',
    sourcemap: false,
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
