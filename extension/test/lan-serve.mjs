import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../website/public/downloads/', import.meta.url));
const port = Number(process.env.PORT || 8080);
const TYPES = { '.zip': 'application/zip', '.html': 'text/html', '.json': 'application/json' };

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/' || url.pathname === '/index.html') {
    const files = (await readdir(root)).filter((f) => f.endsWith('.zip'));
    const links = files.map((f) => `<li><a href="/${f}">${f}</a></li>`).join('');
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(`<!doctype html><meta charset="utf-8"><title>LocatorForge builds</title>
      <h1>LocatorForge v0.9.1</h1><ul>${links}</ul>
      <p>Download, unzip, then load unpacked (chrome://extensions or edge://extensions, Developer mode).</p>`);
    return;
  }
  const name = decodeURIComponent(url.pathname).replace(/^\/+/, '').replace(/\.\./g, '');
  try {
    const body = await readFile(join(root, name));
    res.writeHead(200, {
      'content-type': TYPES[extname(name)] || 'application/octet-stream',
      'content-disposition': `attachment; filename="${name}"`,
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
}).listen(port, '0.0.0.0', () => console.log(`serving ${root} on 0.0.0.0:${port}`));
