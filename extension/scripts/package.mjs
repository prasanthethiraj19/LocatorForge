#!/usr/bin/env node
import archiver from 'archiver';
import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, readdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getVersion } from '../../scripts/version.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// --target=chrome (default) | --target=edge
const target = (process.argv.find((a) => a.startsWith('--target=')) ?? '--target=chrome').split('=')[1];
if (!['chrome', 'edge'].includes(target)) {
  console.error(`[package] unknown target "${target}" — use --target=chrome or --target=edge`);
  process.exit(1);
}

const dist = resolve(root, 'dist', target);

async function main() {
  if (!existsSync(dist)) {
    console.error(`[package] dist/${target}/ missing — run \`npm run build -- --target=${target}\` first`);
    process.exit(1);
  }

  const version = getVersion();
  const name = 'locatorforge';
  const outDir = resolve(root, '..', 'website', 'public', 'downloads');
  await mkdir(outDir, { recursive: true });

  // Stable filename: deploy builds overwrite the same artifact, so the site link
  // is never version-broken. The version lives in the manifest inside the zip and
  // is shown in the UI. Drop zips left behind by the old versioned naming.
  const outFile = resolve(outDir, `${name}-${target}.zip`);
  const keep = new Set([`${name}-chrome.zip`, `${name}-edge.zip`]);
  for (const f of await readdir(outDir)) {
    if (f.startsWith(`${name}-`) && f.endsWith('.zip') && !keep.has(f)) {
      await rm(resolve(outDir, f));
      console.log(`[package] removed stale ${f}`);
    }
  }

  const stream = createWriteStream(outFile);
  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.pipe(stream);
  archive.directory(dist, false);

  await new Promise((resolve, reject) => {
    stream.on('close', resolve);
    archive.on('error', reject);
    archive.finalize();
  });

  console.log(`[package] wrote ${outFile} (${(archive.pointer() / 1024).toFixed(1)} KB, v${version})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
