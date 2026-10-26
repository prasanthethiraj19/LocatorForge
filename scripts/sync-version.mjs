/**
 * Write the current version (see scripts/version.mjs) into every place that
 * carries it, so nothing has to be updated by hand on release:
 *
 *   package.json (root), extension/package.json (+ lock), both extension
 *   manifests, website/package.json, and the README badge.
 *
 * The website and the extension panel do not rely on the committed value: both
 * builds inject the version at build time (`__APP_VERSION__`), so a deploy always
 * displays the version of the commit it deployed. This script keeps the *stored*
 * copies honest — the manifest version is what ends up inside the packaged zip
 * and what the stores see.
 *
 * Usage: node scripts/sync-version.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { getVersion, VERSION_FILES } from './version.mjs';

const version = getVersion();
const changed = [];

async function patchJson(file, label, mutate) {
  const raw = await readFile(file, 'utf8');
  const data = JSON.parse(raw);
  if (data.version === version) {
    console.log(`  = ${label} (${version})`);
    return;
  }
  mutate(data);
  const next = `${JSON.stringify(data, null, 2)}\n`;
  if (next === raw) {
    console.log(`  = ${label} (${version})`);
    return;
  }
  await writeFile(file, next, 'utf8');
  changed.push(label);
  console.log(`  -> ${label}: ${version}`);
}

async function patchText(file, label, pattern, replacement) {
  const raw = await readFile(file, 'utf8');
  if (!pattern.test(raw)) {
    console.log(`  ! ${label}: pattern not found, skipped`);
    return;
  }
  const next = raw.replace(pattern, replacement);
  if (next === raw) {
    console.log(`  = ${label} (${version})`);
    return;
  }
  await writeFile(file, next, 'utf8');
  changed.push(label);
  console.log(`  -> ${label}: ${version}`);
}

console.log(`[version] syncing to ${version}`);

const setVersion = (d) => {
  d.version = version;
};

await patchJson(VERSION_FILES.rootPackage, 'package.json', setVersion);
await patchJson(VERSION_FILES.extensionPackage, 'extension/package.json', setVersion);
await patchJson(VERSION_FILES.websitePackage, 'website/package.json', setVersion);
await patchJson(VERSION_FILES.chromeManifest, 'extension/public/manifest.json', setVersion);
await patchJson(VERSION_FILES.edgeManifest, 'extension/public/manifest.edge.json', setVersion);

// package-lock carries the package version twice (root + "" entry)
await patchJson(VERSION_FILES.extensionLock, 'extension/package-lock.json', (d) => {
  d.version = version;
  if (d.packages && d.packages['']) d.packages[''].version = version;
});

await patchText(
  VERSION_FILES.readme,
  'README.md badge',
  /badge\/version-[0-9.]+-emerald/,
  `badge/version-${version}-emerald`,
);

console.log(
  changed.length
    ? `[version] updated ${changed.length} file(s): ${changed.join(', ')}`
    : '[version] everything already up to date',
);
