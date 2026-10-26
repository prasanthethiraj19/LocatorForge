/**
 * The extension version shown on the marketing site, resolved at build time.
 *
 * `__APP_VERSION__` is injected by vite.config.ts from scripts/version.mjs, so
 * every deploy renders the version of the commit it deployed — no constant to
 * hand-edit. The fallback only matters if the define is missing.
 */
declare const __APP_VERSION__: string;

export const VERSION: string =
  typeof __APP_VERSION__ === 'string' && __APP_VERSION__ ? __APP_VERSION__ : '0.0.0';

export const PKG_NAME = 'locatorforge';

// Stable filenames: the deploy rebuilds the zips, and `?v=` busts the CDN cache
// (downloads are served with max-age=86400) without ever changing the URL shape.
export const CHROME_ZIP_PATH = `/downloads/${PKG_NAME}-chrome.zip?v=${VERSION}`;
export const EDGE_ZIP_PATH = `/downloads/${PKG_NAME}-edge.zip?v=${VERSION}`;
