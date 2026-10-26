/**
 * Panel navigation check — reproduces the "same class name for every page" bug
 * against the SHIPPED panel bundle:
 *
 *   1. mount dist/chrome/assets/panel.js with chrome.devtools stubs
 *   2. panel sits on page A (login) -> pick an element -> basket has 1 item
 *   3. page navigates to B (leave); the first `location.href` read after the
 *      navigate event returns the OLD url (real DevTools race: onNavigated fires
 *      before the navigation commits)
 *   4. pick an element on B, open "Generate POM"
 *   5. assert the class name and URL describe B, not A
 *
 * Usage: node test/panel-nav-check.mjs <cdpPort> [harnessUrl]
 */
import { copyFile, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const port = Number(process.argv[2] || 0);
const HARNESS_URL = process.argv[3] || 'http://localhost:8123/panel-harness-nav.html';
const TARGET = process.env.QC_TARGET === 'edge' ? 'edge' : 'chrome';
if (!port) throw new Error('usage: node panel-nav-check.mjs <cdpPort> [harnessUrl]');

const LOGIN_URL = 'https://opensource-demo.orangehrmlive.com/web/index.php/auth/login';
const LEAVE_URL = 'https://opensource-demo.orangehrmlive.com/web/index.php/leave/viewLeaveList';
const EXPECTED_CLASS = 'LeaveViewLeaveListPage';

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
    const res = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
    if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || 'eval failed');
    return res.result?.value;
  }
}

const checks = [];
const check = (name, pass, detail) => {
  checks.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail === undefined ? '' : `  :: ${detail}`}`);
};

async function waitFor(cdp, page, expr, timeoutMs = 12000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await cdp.evaluate(expr, page)) return true;
    await sleep(200);
  }
  return false;
}

async function main() {
  // serve the shipped bundle + a nav harness page
  const assets = join(root, 'dist', TARGET, 'assets');
  const bundle = (await readdir(assets)).find((f) => f.startsWith('panel') && f.endsWith('.js'));
  if (!bundle) throw new Error(`dist/${TARGET}/assets/panel*.js not found — run npm run build:${TARGET}`);
  await copyFile(join(assets, bundle), join(here, 'panel-built.js'));

  const element = JSON.parse(await readFile(join(here, 'pom-live', 'raw', 'serialized-element.json'), 'utf8'));
  const elementJson = JSON.stringify(element);
  const stub = (await readFile(join(here, 'panel-stubs.js'), 'utf8'))
    .replace(
      "window.__qlcEvalCalls.push(code);\n          if (cb) cb(code === 'location.href' ? location.href : null);",
      `window.__qlcEvalCalls.push(code);
          if (!cb) return Promise.resolve(null);
          if (code === 'location.href') {
            // Simulate the DevTools race: the first href read after a navigate
            // event can still observe the previous document.
            if (window.__qlcStaleHrefOnce) { window.__qlcStaleHrefOnce = false; cb(window.__qlcOldHref); return Promise.resolve(null); }
            cb(window.__qlcHref); return Promise.resolve(null);
          }
          if (code.indexOf('__qlcSerialize($0)') !== -1) {
            // The panel asks for the $0 element; hand it a real serialized element.
            document.body.setAttribute('data-qlc-serving', '1');
            cb(${elementJson}); return Promise.resolve(null);
          }
          cb(null); return Promise.resolve(null);`,
    )
    .replace(
      'network: { onNavigated: { addListener() {}, removeListener() {} } },',
      `network: { onNavigated: { addListener(fn) { (window.__qlcNavHandlers = window.__qlcNavHandlers || []).push(fn); }, removeListener() {} } },`,
    );

  await writeFile(join(here, 'panel-stubs-nav.js'), stub, 'utf8');
  await writeFile(
    join(here, 'panel-harness-nav.html'),
    `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><title>panel nav harness</title></head>
<body>
  <div id="root"></div>
  <script>window.__qlcHref = ${JSON.stringify(LOGIN_URL)}; window.__qlcOldHref = ${JSON.stringify(LOGIN_URL)}; window.__qlcStaleHrefOnce = false;</script>
  <script src="panel-stubs-nav.js"></script>
  <script>window.__fireNav = function () { (window.__qlcNavHandlers || []).forEach(function (fn) { fn(); }); };</script>
  <script type="module" src="./panel-built.js"></script>
</body></html>
`,
    'utf8',
  );

  const browserUrl = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl;
  const ws = new WebSocket(browserUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', () => rej(new Error('ws failed')), { once: true });
  });
  const cdp = new Cdp(ws);

  const infos = (await cdp.send('Target.getTargets')).targetInfos;
  const pageTarget = infos.find((t) => t.type === 'page');
  const { sessionId: page } = await cdp.send('Target.attachToTarget', { targetId: pageTarget.targetId, flatten: true });
  await cdp.send('Page.enable', {}, page);
  await cdp.send('Runtime.enable', {}, page);
  await cdp.send('Page.navigate', { url: HARNESS_URL }, page);
  await sleep(1500);

  const ADD = 'button[title="Add to Page Object basket"]';
  check('panel rendered locator rows', await waitFor(cdp, page, `!!document.querySelector(${JSON.stringify(ADD)})`, 15000), `mounted=${await cdp.evaluate(`!!document.querySelector('#root')`, page)}`);

  // --- page A: add one element ---
  await cdp.evaluate(`document.querySelector(${JSON.stringify(ADD)}).click()`, page);
  await sleep(500);
  check('basket has an item on page A', await cdp.evaluate(`!!document.querySelector('.qlc-basket-bar')`, page));

  // --- navigate to page B, with the stale-first-href race on ---
  await cdp.evaluate(
    `window.__qlcOldHref = window.__qlcHref; window.__qlcHref = ${JSON.stringify(LEAVE_URL)}; window.__qlcStaleHrefOnce = true; window.__fireNav();`,
    page,
  );
  await sleep(2500); // give any refresh/poll strategy time to settle
  const width = await cdp.evaluate(`window.__qlcEvalCalls.filter((c) => c === 'location.href').length`, page);
  check('panel re-read the inspected url after navigating', width >= 2, `${width} href read(s)`);

  // --- page B: add one element, then generate ---
  const rowsAfterNav = await waitFor(cdp, page, `!!document.querySelector(${JSON.stringify(ADD)})`, 10000);
  check('locator rows still available on page B', rowsAfterNav);
  await cdp.evaluate(`document.querySelector(${JSON.stringify(ADD)}).click()`, page);
  await sleep(500);
  await cdp.evaluate(
    `Array.from(document.querySelectorAll('button')).find((b) => /Generate POM/i.test(b.textContent || '')).click()`,
    page,
  );
  await sleep(600);

  const modal = await cdp.evaluate(
    `(() => {
      const fields = Array.from(document.querySelectorAll('.qlc-field'));
      const grab = (label) => {
        const f = fields.find((x) => new RegExp(label, 'i').test(x.textContent || ''));
        const i = f && f.querySelector('input');
        return i ? i.value : null;
      };
      return JSON.stringify({ className: grab('Class name'), url: grab('Page URL'), open: !!document.querySelector('.qlc-modal') });
    })()`,
    page,
  );
  const state = JSON.parse(modal);
  check('page object modal opened', state.open, JSON.stringify(state));
  check(`class name describes page B (${EXPECTED_CLASS})`, state.className === EXPECTED_CLASS, `got "${state.className}"`);
  check('page URL describes page B', state.url === LEAVE_URL, `got "${state.url}"`);

  const failed = checks.filter((c) => !c.pass);
  console.log(`\n${checks.length - failed.length}/${checks.length} panel navigation checks passed`);
  ws.close();
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error('panel nav check failed:', e.message);
  process.exit(2);
});
