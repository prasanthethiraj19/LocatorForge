/**
 * Version policy for LocatorForge.
 *
 *   <major>.<minor>.<commitCount>
 *
 * - `major.minor` is intentional: it lives in `extension/package.json` and is
 *   bumped by hand for a feature/major release.
 * - the patch is the number of commits in the repository, so every push to main
 *   produces a NEW, strictly increasing version. That keeps Chrome/Edge store
 *   uploads valid and means the site can never show a stale number.
 * - `APP_VERSION` overrides everything (CI hotfixes, local experiments).
 *
 * The generated version is applied to every consumer by scripts/sync-version.mjs
 * and injected into both builds (extension panel + website) at build time, so a
 * deploy and the code it shipped always agree.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
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

function commitCount() {
  try {
    const out = execFileSync('git', ['rev-list', '--count', 'HEAD'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const n = Number(out);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    // No git (tarball, some CI checkouts) — fall back to the committed version.
    return null;
  }
}

export function getVersion() {
  const override = process.env.APP_VERSION?.trim();
  if (override) return override;

  const pkg = JSON.parse(readFileSync(VERSION_FILES.extensionPackage, 'utf8'));
  const [major, minor] = String(pkg.version).split('.');
  const count = commitCount();
  return count ? `${major}.${minor}.${count}` : String(pkg.version);
}

// Allow `node scripts/version.mjs` to print the version.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(getVersion());
}
