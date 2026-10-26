/**
 * Probe: run the panel's real injected `SERIALIZE_FN_SOURCE` (from both a plain
 * and a minified bundle — the shipped panel is minified) in the page's MAIN
 * world and in the extension's content-script ISOLATED world.
 *
 * Usage: node test/probe-ser.mjs <cdpPort> [pageUrl]
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const port = Number(process.argv[2] || 0);
const PAGE_URL = process.argv[3] || 'http://localhost:8123/index.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const bundles = ['serialize.cjs', 'serialize.min.cjs'].filter((f) => {
  try {
    require.resolve(join(here, 'pom-live', f));
    return true;
  } catch {
    return false;
  }
});

/**
 * NOTE: the shipped panel builds the injected source at runtime via
 * `Function.prototype.toString`, so it never appears verbatim in panel.js and
 * cannot be extracted for testing. The minified bundle above is the faithful
 * proxy — it reproduces the bundler's parameter renaming, which is exactly what
 * broke the injected path.
 */

const sources = [];
for (const b of bundles) {
  const src = require(join(here, 'pom-live', b)).SERIALIZE_FN_SOURCE;
  let compiles = false;
  try {
    new Function(`${src}\nreturn __qlcSerialize;`)();
    compiles = true;
  } catch (e) {
    console.log(`${b}: new Function FAILED in Node — ${e.message}`);
  }
  const declared = /function\s*([A-Za-z0-9_$]*)\s*\(([A-Za-z0-9_$]*)/.exec(src.trim());
  console.log(`${b}: ${src.length} chars, compiles=${compiles}, name=${declared?.[1]}, param=${declared?.[2]}`);
  sources.push({ label: b, src });
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.listeners = new Map();
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id !== undefined) {
        const p = this.pending.get(msg.id);
        if (p) {
          this.pending.delete(msg.id);
          msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result);
        }
        return;
      }
      for (const fn of this.listeners.get(msg.method) || []) fn(msg.params, msg.sessionId);
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
      setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error(`${method} timed out`));
      }, 30000);
    });
  }
  on(method, fn) {
    const arr = this.listeners.get(method) || [];
    arr.push(fn);
    this.listeners.set(method, arr);
  }
  async evaluate(expression, sessionId, contextId) {
    const params = { expression, returnByValue: true, awaitPromise: true };
    if (contextId) params.contextId = contextId;
    const res = await this.send('Runtime.evaluate', params, sessionId);
    if (res.exceptionDetails) {
      return { exception: res.exceptionDetails.exception?.description || 'eval threw' };
    }
    return res.result?.value;
  }
}

const probe = (label, world, src) => `(() => {
  var out = { label: ${JSON.stringify(label)}, world: ${JSON.stringify(world)} };
  try {
    var f = new Function(${JSON.stringify(src)} + '\\nreturn __qlcSerialize;')();
    out.built = typeof f;
  } catch (e) {
    out.buildError = String(e && e.message || e);
    return JSON.stringify(out);
  }
  try {
    var el = document.querySelector('#top-btn');
    var r = f(el);
    out.serialized = !!r;
    out.tag = r && r.tag;
    out.id = r && r.attrs && r.attrs.id;
    out.cssPath = r && r.cssPath;
  } catch (e) {
    out.runError = String(e && e.message || e);
    out.stack = String(e && e.stack || '').split('\\n').slice(0, 4).join(' | ');
  }
  return JSON.stringify(out);
})()`;

async function main() {
  const browserUrl = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl;
  const ws = new WebSocket(browserUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', () => rej(new Error('ws failed')), { once: true });
  });
  const browser = new Cdp(ws);

  const infos = (await browser.send('Target.getTargets')).targetInfos;
  const sw = infos.find((t) => t.type === 'service_worker' && /\/service-worker\.js$/.test(t.url));
  const extId = sw ? new URL(sw.url).host : null;
  const pageTarget = infos.find((t) => t.type === 'page');
  const { sessionId: page } = await browser.send('Target.attachToTarget', {
    targetId: pageTarget.targetId,
    flatten: true,
  });
  await browser.send('Page.enable', {}, page);

  const contexts = [];
  browser.on('Runtime.executionContextCreated', (p, sid) => {
    if (sid === page) contexts.push(p.context);
  });
  await browser.send('Runtime.enable', {}, page);
  await browser.send('Page.navigate', { url: PAGE_URL }, page);
  await sleep(2500);
  await browser.send('Runtime.enable', {}, page);
  await sleep(800);

  console.log('\nextension id:', extId);
  const tree = await browser.send('Page.getFrameTree', {}, page);
  const mainFrameId = tree.frameTree.frame.id;
  console.log('main frame:', mainFrameId);
  console.log(
    'contexts:',
    contexts
      .map(
        (c) =>
          `${c.id}:${c.origin}${c.name ? `(${c.name})` : ''}${c.auxData?.frameId === mainFrameId ? '[MAIN-FRAME]' : c.auxData?.frameId ? '[sub]' : ''}`,
      )
      .join(', '),
  );

  const newest = (pred) =>
    [...contexts].reverse().find((c) => pred(c) && c.auxData?.frameId === mainFrameId);
  const mainCtx = newest((c) => (c.origin || '').startsWith('http'));
  const isoCtx = newest((c) => (c.origin || '').startsWith('chrome-extension://'));

  console.log(
    '\ntop-frame buttons:',
    await browser.evaluate(`document.querySelectorAll('button').length`, page, mainCtx?.id),
  );

  const checks = [];
  for (const { label, src } of sources) {
    for (const [world, ctx] of [['main', mainCtx], ['isolated', isoCtx]]) {
      const raw = await browser.evaluate(probe(label, world, src), page, ctx?.id);
      const res = JSON.parse(raw);
      const ok = res.serialized === true && res.tag === 'button';
      checks.push(ok);
      console.log(
        `${ok ? 'PASS' : 'FAIL'}  ${label} / ${world}  :: tag=${res.tag} id=${res.id} cssPath=${res.cssPath}${res.runError ? `  runError=${res.runError}  stack=${res.stack}` : ''}${res.buildError ? `  buildError=${res.buildError}` : ''}`,
      );
    }
  }

  const recorderFlag = await browser.evaluate(
    `JSON.stringify({recorderLoaded: !!window.__qlcRecorderLoaded, overlay: !!document.getElementById('__qlc_overlay')})`,
    page,
    isoCtx?.id,
  );
  console.log('isolated world state:', recorderFlag);

  const failed = checks.filter((c) => !c).length;
  console.log(`\n${checks.length - failed}/${checks.length} injected-source checks passed`);
  ws.close();
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error('probe failed:', e.message);
  process.exit(1);
});
