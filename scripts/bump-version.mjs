/**
 * Bump the version and fan it out to every consumer. Run by CI on every push to
 * main (.github/workflows/version.yml) and available locally:
 *
 *   node scripts/bump-version.mjs            # patch (default)
 *   node scripts/bump-version.mjs minor      # feature release
 *   node scripts/bump-version.mjs major
 *   node scripts/bump-version.mjs set 1.0.0  # explicit version
 */
import { bumpVersion, getVersion, VERSION_FILES } from './version.mjs';
import { syncVersion } from './sync-version.mjs';
import { readFile, writeFile } from 'node:fs/promises';

const [, , part = 'patch', explicit] = process.argv;
const previous = getVersion();

let next;
if (part === 'set') {
  if (!/^\d+\.\d+\.\d+$/.test(explicit || '')) {
    console.error('[version] usage: node scripts/bump-version.mjs set <major.minor.patch>');
    process.exit(1);
  }
  const pkg = JSON.parse(await readFile(VERSION_FILES.extensionPackage, 'utf8'));
  pkg.version = explicit;
  await writeFile(VERSION_FILES.extensionPackage, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  next = explicit;
} else {
  if (!['patch', 'minor', 'major'].includes(part)) {
    console.error('[version] usage: node scripts/bump-version.mjs [patch|minor|major|set <version>]');
    process.exit(1);
  }
  next = bumpVersion(part);
}

console.log(`[version] ${previous} -> ${next}`);
await syncVersion();
