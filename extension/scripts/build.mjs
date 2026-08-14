#!/usr/bin/env node
import { build as viteBuild } from 'vite';
import { build as esbuild } from 'esbuild';
import { mkdir, copyFile, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dist = resolve(root, 'dist');

async function clean() {
  if (existsSync(dist)) await rm(dist, { recursive: true });
  await mkdir(dist, { recursive: true });
  await mkdir(resolve(dist, 'icons'), { recursive: true });
  await mkdir(resolve(dist, 'assets'), { recursive: true });
}

async function buildPanel() {
  await viteBuild({ root, configFile: resolve(root, 'vite.config.ts') });
}

async function buildBundle(entry, outfile, format) {
  await esbuild({
    entryPoints: [resolve(root, entry)],
    bundle: true,
    format,
    target: 'chrome116',
    outfile: resolve(dist, outfile),
    minify: true,
    legalComments: 'none',
    define: { 'process.env.NODE_ENV': '"production"' },
  });
}

async function copyStatic() {
  const pub = resolve(root, 'public');
  await copyFile(resolve(pub, 'manifest.json'), resolve(dist, 'manifest.json'));
  await copyFile(resolve(root, 'src/content/content.css'), resolve(dist, 'content.css'));
  if (existsSync(resolve(root, 'src/content/freeze.css'))) {
    await copyFile(resolve(root, 'src/content/freeze.css'), resolve(dist, 'freeze.css'));
  }
  if (existsSync(resolve(root, 'src/content/recorder.css'))) {
    await copyFile(resolve(root, 'src/content/recorder.css'), resolve(dist, 'recorder.css'));
  }
  if (existsSync(resolve(pub, 'sidepanel.html'))) {
    await copyFile(resolve(pub, 'sidepanel.html'), resolve(dist, 'sidepanel.html'));
  }

  const icons = resolve(pub, 'icons');
  if (existsSync(icons)) {
    for (const f of await readdir(icons)) {
      await copyFile(resolve(icons, f), resolve(dist, 'icons', f));
    }
  }
}

async function rewriteHtmlPaths() {
  for (const name of ['devtools.html', 'panel.html']) {
    const src = resolve(dist, 'src', name.startsWith('devtools') ? 'devtools' : 'panel', name);
    const dst = resolve(dist, name);
    if (existsSync(src)) {
      const html = await readFile(src, 'utf8');
      const rewritten = html
        .replace(/src="(?:\.\.\/)+assets\//g, 'src="assets/')
        .replace(/href="(?:\.\.\/)+assets\//g, 'href="assets/');
      await writeFile(dst, rewritten);
    }
  }
  if (existsSync(resolve(dist, 'src'))) {
    await rm(resolve(dist, 'src'), { recursive: true });
  }
}

async function main() {
  console.log('[build] cleaning dist/');
  await clean();

  console.log('[build] vite (panel + devtools)');
  await buildPanel();

  console.log('[build] esbuild service-worker.js');
  await buildBundle('src/background/service-worker.ts', 'service-worker.js', 'esm');

  console.log('[build] esbuild content.js');
  await buildBundle('src/content/content.ts', 'content.js', 'iife');

  if (existsSync(resolve(root, 'src/content/freeze.ts'))) {
    console.log('[build] esbuild freeze.js');
    await buildBundle('src/content/freeze.ts', 'freeze.js', 'iife');
  }

  if (existsSync(resolve(root, 'src/content/recorder.ts'))) {
    console.log('[build] esbuild recorder.js');
    await buildBundle('src/content/recorder.ts', 'recorder.js', 'iife');
  }

  console.log('[build] copying static assets');
  await copyStatic();

  console.log('[build] rewriting HTML paths');
  await rewriteHtmlPaths();

  console.log('[build] done → dist/');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
