import { recordDownload, type Browser } from '../website/server/counter';

export async function GET(request: Request): Promise<Response> {
  const browser = new URL(request.url).searchParams.get('browser');
  if (browser !== 'chrome' && browser !== 'edge') {
    return new Response('unknown browser', { status: 400 });
  }

  const target = await recordDownload(browser as Browser);
  return new Response(null, {
    status: 302,
    headers: {
      Location: new URL(target, request.url).toString(),
      'Cache-Control': 'no-store',
    },
  });
}
