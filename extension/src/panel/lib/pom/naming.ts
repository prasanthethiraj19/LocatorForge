import type { Candidate } from '../locators/types';

export function suggestFieldName(c: Candidate): string {
  let seed = c.args.value || c.args.role || c.args.name || c.args.label || c.cssOrXPath || c.kind;
  if (c.kind === 'role' && c.args.name) seed = `${c.args.role}_${c.args.name}`;
  return camel(seed);
}

export function camel(input: string): string {
  const parts = input
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 5);
  if (parts.length === 0) return 'el';
  return parts
    .map((w, i) =>
      i === 0
        ? w.toLowerCase()
        : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
    )
    .join('');
}

export function snake(input: string): string {
  return camel(input)
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

const GENERIC_SEGMENTS = new Set([
  'web', 'www', 'app', 'apps', 'index', 'index.php', 'index.html', 'index.htm',
  'default', 'home', 'pages', 'page', 'php', 'html', 'htm', 'aspx', 'jsp',
  'auth', 'account', 'portal', 'site', 'main', 'root', 'en', 'us', 'ui',
]);

function pathSource(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.hash.replace(/^#!?/, '#');
  } catch {
    return url.split(/[?#]/)[0];
  }
}

function meaningfulSegments(url: string): string[] {
  return pathSource(url)
    .split(/[/#!]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length <= 32 && !s.includes('.'))
    .filter((s) => !GENERIC_SEGMENTS.has(s.toLowerCase()))
    .filter((s) => !/^v?\d+$/i.test(s))
    .filter((s) => !/^[0-9a-f]{8,}$/i.test(s));
}

export function pageKeyFromUrl(url: string): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, '');
    return u.origin + (path || '/') + u.hash;
  } catch {
    return url.split(/[?#]/)[0].replace(/\/+$/, '');
  }
}

export function suggestClassName(url: string): string {
  const tail = meaningfulSegments(url).slice(-2);
  if (!tail.length) return 'PageObject';
  const name = tail
    .map((s) => s.replace(/[^A-Za-z0-9]+/g, ' ').trim())
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
  return name ? `${name}Page` : 'PageObject';
}

// Sanitize a user-supplied class name without flattening existing inner
// capitals — "LoginPage" must stay "LoginPage", not "Loginpage".
export function pageClass(input: string): string {
  const words = input
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return 'PageObject';
  const name = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  return /^[0-9]/.test(name) ? `Page${name}` : name;
}

export function dedupeFieldNames(items: { fieldName: string }[]): void {
  const counts = new Map<string, number>();
  for (const it of items) {
    const n = (counts.get(it.fieldName) || 0) + 1;
    counts.set(it.fieldName, n);
    if (n > 1) it.fieldName = it.fieldName + n;
  }
}
