#!/usr/bin/env node
import archiver from 'archiver';
import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

  const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  const version = pkg.version;
  const name = pkg.name;
  const outDir = resolve(root, '..', 'website', 'public', 'downloads');
  await mkdir(outDir, { recursive: true });

  const outFile = resolve(outDir, `${name}-${target}-v${version}.zip`);
  const stream = createWriteStream(outFile);
  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.pipe(stream);
  archive.directory(dist, false);

  await new Promise((resolve, reject) => {
    stream.on('close', resolve);
    archive.on('error', reject);
    archive.finalize();
  });

  console.log(`[package] wrote ${outFile} (${(archive.pointer() / 1024).toFixed(1)} KB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
