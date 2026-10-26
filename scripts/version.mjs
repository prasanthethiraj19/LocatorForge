/**
 * Version policy for LocatorForge.
 *
 * The version is a plain semver committed in `extension/package.json` — the one
 * source of truth — and it is bumped automatically on every push to main by
 * `.github/workflows/version.yml` (scripts/bump-version.mjs), then fanned out to
 * every consumer by scripts/sync-version.mjs.
 *
 * Both builds inject it at build time (`__APP_VERSION__`), so the website and the
 * panel footer always render the version of the commit they were built from, and
 * the packaged extension manifest carries the same number.
 *
 * `APP_VERSION` overrides everything (hotfix builds, experiments).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Paths that carry the version in the repository. */
export const VERSION_FILES = {
  rootPackage: resolve(repoRoot, 'package.json'),
  extensionPackage: resolve(repoRoot, 'extension/package.json'),
  extensionLock: resolve(repoRoot, 'extension/package-lock.json'),
  chromeManifest: resolve(repoRoot, 'extension/public/manifest.json'),
  edgeManifest: resolve(repoRoot, 'extension/public/manifest.edge.json'),
  websitePackage: resolve(repoRoot, 'website/package.json'),
  readme: resolve(repoRoot, 'README.md'),
};

/** The committed version (or the APP_VERSION override). */
export function getVersion() {
  const override = process.env.APP_VERSION?.trim();
  if (override) return override;
  return JSON.parse(readFileSync(VERSION_FILES.extensionPackage, 'utf8')).version;
}

/**
 * Increment the source-of-truth version and return it. `part` is one of
 * patch | minor | major — patch is what CI does on every push.
 */
export function bumpVersion(part = 'patch') {
  const pkg = JSON.parse(readFileSync(VERSION_FILES.extensionPackage, 'utf8'));
  const [major = 0, minor = 0, patch = 0] = String(pkg.version)
    .split('.')
    .map((n) => Number.parseInt(n, 10) || 0);

  const next =
    part === 'major' ? `${major + 1}.0.0` : part === 'minor' ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`;

  pkg.version = next;
  writeFileSync(VERSION_FILES.extensionPackage, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  return next;
}

// Allow `node scripts/version.mjs` to print the version.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(getVersion());
}
