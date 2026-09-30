import { readDownloadCounts } from '../website/server/counter';

export async function GET(): Promise<Response> {
  const counts = await readDownloadCounts();
  return new Response(JSON.stringify(counts), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
