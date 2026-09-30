export type Browser = 'chrome' | 'edge';

export interface DownloadCounts {
  chrome: number;
  edge: number;
  total: number;
}

export function countDownload(browser: Browser): void {
  void fetch(`/api/stats?browser=${browser}`, { method: 'POST', keepalive: true }).catch(() => {});
}

export async function fetchDownloadCounts(): Promise<DownloadCounts | null> {
  try {
    const response = await fetch('/api/stats', { cache: 'no-store' });
    if (!response.ok) return null;
    const data = (await response.json()) as DownloadCounts;
    return typeof data?.total === 'number' ? data : null;
  } catch {
    return null;
  }
}
