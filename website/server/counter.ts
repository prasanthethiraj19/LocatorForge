import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { CHROME_ZIP_PATH, EDGE_ZIP_PATH } from '../src/lib/version';

export type Browser = 'chrome' | 'edge';

export interface DownloadCounts {
  chrome: number;
  edge: number;
  total: number;
}

const KEY_PREFIX = 'locatorforge:downloads';
const LOCAL_FILE = resolve(process.cwd(), '.downloads.local.json');

function restStore(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/+$/, ''), token } : null;
}

async function redis(command: (string | number)[] | (string | number)[][]): Promise<unknown> {
  const store = restStore()!;
  const response = await fetch(store.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${store.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`counter store returned ${response.status}`);
  const data = (await response.json()) as { result?: unknown };
  return data.result;
}

function toCount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function withTotal(chrome: number, edge: number): DownloadCounts {
  return { chrome, edge, total: chrome + edge };
}

async function readLocalCounts(): Promise<DownloadCounts> {
  try {
    const raw = await readFile(LOCAL_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<DownloadCounts>;
    return withTotal(toCount(parsed.chrome), toCount(parsed.edge));
  } catch {
    return withTotal(0, 0);
  }
}

export function zipPath(browser: Browser): string {
  return browser === 'chrome' ? CHROME_ZIP_PATH : EDGE_ZIP_PATH;
}

export async function readDownloadCounts(): Promise<DownloadCounts> {
  try {
    if (restStore()) {
      const [chrome, edge] = (await redis([
        ['GET', `${KEY_PREFIX}:chrome`],
        ['GET', `${KEY_PREFIX}:edge`],
      ])) as Array<{ result?: unknown }>;
      return withTotal(toCount(chrome?.result), toCount(edge?.result));
    }
    return await readLocalCounts();
  } catch {
    return withTotal(0, 0);
  }
}

async function incrementDownload(browser: Browser): Promise<void> {
  if (restStore()) {
    await redis(['INCR', `${KEY_PREFIX}:${browser}`]);
    return;
  }
  const counts = await readLocalCounts();
  counts[browser] += 1;
  await writeFile(
    LOCAL_FILE,
    JSON.stringify({ chrome: counts.chrome, edge: counts.edge }, null, 2),
    'utf8',
  );
}

export async function recordDownload(browser: Browser): Promise<string> {
  try {
    await incrementDownload(browser);
  } catch {
    // A failed count must never block a real download.
  }
  return zipPath(browser);
}
