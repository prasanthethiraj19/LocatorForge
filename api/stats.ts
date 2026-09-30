import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type Browser = 'chrome' | 'edge';

interface DownloadCounts {
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

async function redis(command: unknown): Promise<unknown> {
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
  return ((await response.json()) as { result?: unknown }).result;
}

function toCount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function withTotal(chrome: number, edge: number): DownloadCounts {
  return { chrome, edge, total: chrome + edge };
}

async function readLocal(): Promise<DownloadCounts> {
  try {
    const raw = await readFile(LOCAL_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<DownloadCounts>;
    return withTotal(toCount(parsed.chrome), toCount(parsed.edge));
  } catch {
    return withTotal(0, 0);
  }
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
    return await readLocal();
  } catch {
    return withTotal(0, 0);
  }
}

async function increment(browser: Browser): Promise<void> {
  if (restStore()) {
    await redis(['INCR', `${KEY_PREFIX}:${browser}`]);
    return;
  }
  const counts = await readLocal();
  counts[browser] += 1;
  await writeFile(
    LOCAL_FILE,
    JSON.stringify({ chrome: counts.chrome, edge: counts.edge }, null, 2),
    'utf8',
  );
}

function json(counts: DownloadCounts): Response {
  return new Response(JSON.stringify(counts), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

export async function GET(): Promise<Response> {
  return json(await readDownloadCounts());
}

export async function POST(request: Request): Promise<Response> {
  const browser = new URL(request.url).searchParams.get('browser');
  if (browser !== 'chrome' && browser !== 'edge') {
    return new Response('unknown browser', { status: 400 });
  }

  try {
    await increment(browser);
  } catch {
    // A failed count must never surface to the visitor.
  }

  return json(await readDownloadCounts());
}
