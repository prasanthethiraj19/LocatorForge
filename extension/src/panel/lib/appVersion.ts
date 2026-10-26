/**
 * The extension version, injected at build time by vite.config.ts
 * (see scripts/version.mjs for the version policy).
 *
 * `declare const` keeps this honest if the define is ever missing: the typeof
 * guard avoids a hard ReferenceError.
 */
declare const __APP_VERSION__: string;

export const APP_VERSION: string =
  typeof __APP_VERSION__ === 'string' && __APP_VERSION__ ? __APP_VERSION__ : '0.0.0';
