/**
 * Extension E2E — drives the REAL built extension (dist/chrome) in a real Chrome
 * over CDP, without needing the DevTools panel: it exercises the content-script
 * + service-worker plumbing that pick mode and the recorder depend on.
 *
 * Usage: node test/ext-e2e.mjs <cdpPort> [pageUrl]
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2] || 0);
const PAGE_URL = process.argv[3] || 'http://localhost:8123/';
if (!port) throw new Error('usage: node ext-e2e.mjs <cdpPort> [pageUrl]');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
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
      this.events.push(msg);
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
}

async function connectWs(url) {
  const ws = new WebSocket(url);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', () => reject(new Error(`ws failed: ${url}`)), { once: true });
  });
  return new Cdp(ws);
}

const checks = [];
function check(name, pass, detail) {
  checks.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail === undefined ? '' : `  :: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`}`);
}

async function main() {
  const browserUrl = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl;

  // Make sure a page target exists before attaching.
  const ensurePage = async () => {
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    if (list.some((t) => t.type === 'page')) return;
    await fetch(`http://127.0.0.1:${port}/json/new?url=${encodeURIComponent(PAGE_URL)}`, { method: 'PUT' });
    await sleep(1500);
  };
  await ensurePage();

  const browser = await connectWs(browserUrl);

  const targets = (await browser.send('Target.getTargets')).targetInfos;
  const findSw = (infos) => infos.find((t) => t.type === 'service_worker' && /\/service-worker\.js$/.test(t.url));
  const extId = (() => {
    const sw = findSw(targets);
    return sw ? new URL(sw.url).host : null;
  })();

  const pageTarget = targets.find((t) => t.type === 'page');
  if (!pageTarget) throw new Error('no page target');
  const { sessionId: page } = await browser.send('Target.attachToTarget', {
    targetId: pageTarget.targetId,
    flatten: true,
  });
  await browser.send('Page.enable', {}, page);
  await browser.send('Runtime.enable', {}, page);

  // Extension isolated world contexts (evidence that content scripts loaded).
  const contexts = [];
  const consoleEntries = [];
  browser.on('Runtime.executionContextCreated', (p, sid) => {
    if (sid === page) contexts.push(p.context);
  });
  browser.on('Runtime.exceptionThrown', (p, sid) => {
    if (sid === page) {
      consoleEntries.push(`EXC ${p.exceptionDetails?.exception?.description || p.exceptionDetails?.text}`);
    }
  });
  browser.on('Log.entryAdded', (p, sid) => {
    if (sid === page) consoleEntries.push(`LOG ${p.entry.level}: ${p.entry.text}`);
  });
  await browser.send('Log.enable', {}, page);
  await browser.send('Page.navigate', { url: PAGE_URL }, page);
  await sleep(2500);
  await browser.send('Runtime.enable', {}, page);
  await browser.send('Page.reload', {}, page);
  await sleep(2500);

  // NOTE: `window.__qlcRecorderLoaded` cannot be read through CDP — evaluating in
  // the content script's isolated world does not expose extension bindings or the
  // page's expando state. Recorder liveness is asserted below via REC_START +
  // REC_EVENT instead.
  const frameTree = await browser.send('Page.getFrameTree', {}, page);
  const mainFrameId = frameTree.frameTree.frame.id;
  const newestInMain = (pred) =>
    [...contexts].reverse().find((c) => pred(c) && c.auxData?.frameId === mainFrameId);
  const extCtx = newestInMain((c) => (c.origin || '').startsWith('chrome-extension://'));
  check('content script isolated world present', !!extCtx, extCtx?.origin || 'none');
  void extCtx;

  const pageUrl = await browser.evaluate('location.href', page);
  check('page loaded', pageUrl === PAGE_URL || pageUrl.startsWith(PAGE_URL), pageUrl);

  // ---- wake + attach the service worker ----
  // A dormant MV3 worker is woken by any message from the content script.
  if (extCtx) {
    try {
      await browser.send(
        'Runtime.evaluate',
        {
          expression: `chrome.runtime.sendMessage({ type: '__qlc_ping' }).catch(() => {})`,
          contextId: extCtx.id,
          awaitPromise: true,
        },
        page,
      );
    } catch {}
  }

  let swSession = null;
  for (let i = 0; i < 40 && !swSession; i++) {
    const infos = (await browser.send('Target.getTargets')).targetInfos;
    const sw = findSw(infos);
    if (sw) {
      const { sessionId } = await browser.send('Target.attachToTarget', {
        targetId: sw.targetId,
        flatten: true,
      });
      swSession = sessionId;
    } else {
      await sleep(500);
    }
  }
  check('service worker attachable', !!swSession);
  if (!swSession) return finish();

  await browser.send('Runtime.enable', {}, swSession);
  await browser.send(
    'Runtime.evaluate',
    {
      expression: `self.__qlcLog = []; self.__qlcPicks = []; self.__qlcSteps = [];
        chrome.runtime.onMessage.addListener((m) => {
          self.__qlcLog.push(m && m.type);
          if (m && m.type === 'PICK_RESULT') self.__qlcPicks.push(m);
          if (m && m.type === 'REC_EVENT') self.__qlcSteps.push(m.step);
        });
        'ok'`,
      returnByValue: true,
    },
    swSession,
  );

  const tabIds = await browser.evaluate(
    `chrome.tabs.query({}).then((ts) => ts.map((t) => t.id))`,
    swSession,
  );
  check('tabs visible to SW', Array.isArray(tabIds) && tabIds.length > 0, tabIds);
  if (!tabIds?.length) return finish();

  // Send to every tab — the extension has no "tabs" permission, so it cannot
  // read tab.url and match the fixture tab by URL.
  await browser.evaluate(
    `self.__qlcSend = (type) => chrome.tabs.query({}).then((ts) => Promise.all(ts.map((t) => chrome.tabs.sendMessage(t.id, { type }).catch(() => null)))).then(() => 'sent')`,
    swSession,
  );

  const pickStart = (type) =>
    browser.evaluate(`self.__qlcSend(${JSON.stringify(type)})`, swSession);

  const overlayState = () =>
    browser.evaluate(
      `(() => { const o = document.getElementById('__qlc_overlay'); return o ? (o.style.display || 'block') : null; })()`,
      page,
    );

  const clickSelector = async (sel) => {
    const box = await browser.evaluate(
      `(() => {
        let el = document.querySelector(${JSON.stringify(sel)});
        if (!el) {
          for (const h of document.querySelectorAll('*')) {
            if (h.shadowRoot) { const inner = h.shadowRoot.querySelector(${JSON.stringify(sel)}); if (inner) { el = inner; break; } }
          }
        }
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      })()`,
      page,
    );
    if (!box) throw new Error(`selector not found: ${sel}`);
    await browser.send(
      'Input.dispatchMouseEvent',
      { type: 'mouseMoved', x: box.x, y: box.y, button: 'none' },
      page,
    );
    await browser.send(
      'Input.dispatchMouseEvent',
      { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 },
      page,
    );
    await browser.send(
      'Input.dispatchMouseEvent',
      { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 },
      page,
    );
    await sleep(400);
  };

  const log = () =>
    browser.evaluate(
      `JSON.stringify({ log: self.__qlcLog, picks: self.__qlcPicks.map((m) => ({ tag: m.element && m.element.tag, id: m.element && m.element.attrs && m.element.attrs.id, testid: m.element && m.element.attrs && m.element.attrs['data-testid'], nullElement: m.element === null, diag: m.diag, keys: m.element ? Object.keys(m.element).length : 0 })) })`,
      swSession,
    );

  // ---- pick #1 ----
  const r1 = await pickStart('PICK_START');
  check('PICK_START delivered to content script', r1 === 'sent', r1);
  check('pick overlay visible after PICK_START', (await overlayState()) !== null, await overlayState());

  await clickSelector('#top-btn');
  let after1 = JSON.parse(await log());
  check('pick #1 produced PICK_RESULT', after1.picks.length === 1, after1.log);
  check(
    'pick #1 resolved the clicked element',
    after1.picks[0]?.id === 'top-btn' || after1.picks[0]?.testid === 'top',
    after1.picks[0],
  );
  check('pick overlay hidden after pick', (await overlayState()) === 'none', await overlayState());
  const rawElement = await browser.evaluate(
    `JSON.stringify((self.__qlcPicks[0] || {}).element || null)`,
    swSession,
  );
  if (rawElement && rawElement !== 'null') {
    await mkdir(join(here, 'pom-live', 'raw'), { recursive: true });
    await writeFile(join(here, 'pom-live', 'raw', 'serialized-element.json'), rawElement, 'utf8');
  } else {
    check('serialized element captured for the panel harness', false, 'no element in PICK_RESULT');
  }

  // ---- pick #2 (the reported regression: second pick must also work) ----
  const r2 = await pickStart('PICK_START');
  check('PICK_START delivered again', r2 === 'sent', r2);
  await clickSelector('#close-icon');
  await sleep(300);
  const after2 = JSON.parse(await log());
  check('pick #2 produced a SECOND PICK_RESULT', after2.picks.length === 2, after2.log);
  check('pick #2 resolved a DIFFERENT element (svg)', after2.picks[1]?.tag === 'svg', {
    pick1: after2.picks[0],
    pick2: after2.picks[1],
  });

  // ---- pick #3 in a row, click the shadow button ----
  await pickStart('PICK_START');
  await clickSelector('#shadow-btn');
  await sleep(300);
  const after3 = JSON.parse(await log());
  check('pick #3 produced a THIRD PICK_RESULT', after3.picks.length === 3, after3.log);
  check('pick #3 resolved the shadow-DOM button', after3.picks[2]?.id === 'shadow-btn', after3.picks[2]);

  console.log('\npage console during picks:');
  for (const e of consoleEntries.slice(-10)) console.log('   ', e);

  // ---- recorder ----
  const recStart = await pickStart('REC_START');
  check('REC_START delivered', recStart === 'sent', recStart);
  await sleep(600);
  const dot = await browser.evaluate(
    `(() => { const d = document.getElementById('__qlc_recorder_dot'); return d ? (d.style.display || 'block') : null; })()`,
    page,
  );
  check('recording indicator visible', dot === 'block', dot);

  await clickSelector('#top-btn');
  await sleep(400);
  const recLog = JSON.parse(await log());
  check('recorder produced a REC_EVENT', recLog.log.includes('REC_EVENT'), recLog.log);

  const stepsJson = await browser.evaluate('JSON.stringify(self.__qlcSteps)', swSession);
  const steps = JSON.parse(stepsJson);
  check(
    'recorded step carries a serialized element',
    steps.length > 0 && !!steps[0]?.element?.attrs?.id && !!steps[0]?.element?.cssPath,
    steps[0] ? { action: steps[0].action, id: steps[0].element?.attrs?.id, cssPath: steps[0].element?.cssPath } : 'no steps',
  );
  if (steps.length) {
    await mkdir(join(here, 'pom-live', 'raw'), { recursive: true });
    await writeFile(join(here, 'pom-live', 'raw', 'recorder-steps.json'), JSON.stringify(steps, null, 2), 'utf8');
  }

  await pickStart('REC_STOP');
  await sleep(400);
  const dotAfter = await browser.evaluate(
    `(() => { const d = document.getElementById('__qlc_recorder_dot'); return d ? (d.style.display || 'block') : null; })()`,
    page,
  );
  check('recording indicator hidden after REC_STOP', dotAfter === 'none', dotAfter);

  finish(extId);
}

function finish(extId) {
  const failed = checks.filter((c) => !c.pass);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed${extId ? ` (extension ${extId})` : ''}`);
  if (failed.length) console.log('failed:', failed.map((f) => f.name).join(' | '));
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error('e2e failed:', e.message);
  process.exit(2);
});
