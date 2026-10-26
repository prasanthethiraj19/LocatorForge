/**
 * Panel injection check — loads the SHIPPED panel bundle (dist/chrome/assets/panel-*.js)
 * in a plain page with chrome.devtools stubs, captures the exact code it passes to
 * `inspectedWindow.eval`, and runs that code against a real DOM element.
 *
 * This is the artifact that failed with "ReferenceError: e is not defined": the
 * panel builds its injected serializer source at runtime, so only running the
 * shipped bundle proves the emitted source is valid.
 *
 * Usage: node test/panel-injection-check.mjs <cdpPort> [harnessUrl]
 */
import { copyFile, readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const port = Number(process.argv[2] || 0);
const HARNESS_URL = process.argv[3] || 'http://localhost:8123/panel-harness.html';
if (!port) throw new Error('usage: node panel-injection-check.mjs <cdpPort> [harnessUrl]');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  async evaluate(expression, sessionId) {
    const res = await this.send(
      'Runtime.evaluate',
      { expression, returnByValue: true, awaitPromise: true },
      sessionId,
    );
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description || 'eval failed');
    }
    return res.result?.value;
  }
  /** Raw evaluate — returns the completion value AND any exception, like DevTools eval. */
  async evaluateRaw(expression, sessionId) {
    const res = await this.send(
      'Runtime.evaluate',
      { expression, returnByValue: true, awaitPromise: true },
      sessionId,
    );
    return {
      value: res.result?.value,
      exception: res.exceptionDetails
        ? res.exceptionDetails.exception?.description || res.exceptionDetails.text
        : null,
    };
  }
}

const checks = [];
const check = (name, pass, detail) => {
  checks.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail === undefined ? '' : `  :: ${detail}`}`);
};

async function shippedPanelBundle() {
  const dir = join(root, 'dist', 'chrome', 'assets');
  const files = await readdir(dir);
  const bundle = files.find((f) => f.startsWith('panel') && f.endsWith('.js'));
  if (!bundle) throw new Error('dist/chrome/assets/panel*.js not found — run npm run build:chrome');
  return { src: join(dir, bundle), bytes: (await readFile(join(dir, bundle))).length };
}

async function main() {
  const bundle = await shippedPanelBundle();
  await copyFile(bundle.src, join(here, 'panel-built.js'));
  console.log(`serving shipped panel bundle: ${bundle.src} (${bundle.bytes} bytes)`);

  const browserUrl = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl;
  const ws = new WebSocket(browserUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', () => rej(new Error('ws failed')), { once: true });
  });
  const browser = new Cdp(ws);

  const infos = (await browser.send('Target.getTargets')).targetInfos;
  const pageTarget = infos.find((t) => t.type === 'page');
  if (!pageTarget) throw new Error('no page target');
  const { sessionId: page } = await browser.send('Target.attachToTarget', {
    targetId: pageTarget.targetId,
    flatten: true,
  });
  await browser.send('Page.enable', {}, page);
  await browser.send('Runtime.enable', {}, page);

  const consoleErrors = [];
  browser.on('Runtime.exceptionThrown', (p, sid) => {
    if (sid === page) consoleErrors.push(p.exceptionDetails?.exception?.description || p.exceptionDetails?.text);
  });
  browser.on('Runtime.consoleAPICalled', (p, sid) => {
    if (sid === page && p.type === 'error') {
      consoleErrors.push((p.args || []).map((a) => a.value ?? a.description).join(' '));
    }
  });

  await browser.send('Page.navigate', { url: HARNESS_URL }, page);
  await sleep(1500);

  check(
    'shipped panel bundle mounted',
    await browser.evaluate(`!!document.querySelector('#root') && document.querySelector('#root').childElementCount > 0`, page),
    await browser.evaluate(`document.querySelector('#root') ? document.querySelector('#root').childElementCount + ' root children' : 'no root'`, page),
  );

  // The panel polls $0 through inspectedWindow.eval on mount.
  let serializerCall = null;
  for (let i = 0; i < 40 && !serializerCall; i++) {
    const calls = await browser.evaluate(`JSON.stringify(window.__qlcEvalCalls || [])`, page);
    const list = JSON.parse(calls || '[]');
    serializerCall = list.find((c) => c.includes('__qlcSerialize($0)')) || null;
    if (!serializerCall) await sleep(250);
  }
  check('panel issued its injected serializer eval', !!serializerCall, serializerCall ? `${serializerCall.length} chars` : 'none captured');
  if (!serializerCall) return finish();

  const declared = /function\s*([A-Za-z0-9_$]*)\s*\(([A-Za-z0-9_$]*)/.exec(serializerCall);
  check('injected source declares __qlcSerialize', declared?.[1] === '__qlcSerialize', `name=${declared?.[1]} param=${declared?.[2]}`);

  // Run the exact injected code with $0 pointing at a real element.
  await browser.evaluate(`window.$0 = document.querySelector('#top-btn')`, page);
  const withEl = await browser.evaluateRaw(serializerCall, page);
  check(
    'injected code serializes $0 without throwing',
    !withEl.exception && withEl.value && withEl.value.tag === 'button' && withEl.value.attrs?.id === 'top-btn',
    withEl.exception ? `exception=${withEl.exception}` : `tag=${withEl.value?.tag} id=${withEl.value?.attrs?.id}`,
  );

  // And returns null (not an error) when nothing is selected.
  await browser.evaluate(`try { delete window.$0; } catch (e) { window.$0 = undefined; }`, page);
  const noEl = await browser.evaluateRaw(serializerCall, page);
  check('injected code returns null when $0 is absent', !noEl.exception && noEl.value === null, noEl.exception ? `exception=${noEl.exception}` : `value=${JSON.stringify(noEl.value)}`);

  const realErrors = consoleErrors.filter((e) => !/Failed to load resource|404/.test(e));
  check('no panel runtime errors', realErrors.length === 0, realErrors.slice(0, 3).join(' | ') || 'none');

  finish();
}

function finish() {
  const failed = checks.filter((c) => !c.pass);
  console.log(`\n${checks.length - failed.length}/${checks.length} panel-injection checks passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error('panel injection check failed:', e.message);
  process.exit(2);
});
