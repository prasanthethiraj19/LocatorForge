/**
 * Navigation probe — determines whether OrangeHRM's in-app menu clicks cause a
 * real document navigation (which fires chrome.devtools.network.onNavigated) or
 * a same-document SPA route change (which does not).
 *
 * Usage: node test/nav-probe.mjs <cdpPort>
 */
const port = Number(process.argv[2] || 0);
const BASE = 'https://opensource-demo.orangehrmlive.com';
if (!port) throw new Error('usage: node nav-probe.mjs <cdpPort>');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.listeners = new Map();
    this.navigations = [];
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
      }, 45000);
    });
  }
  on(method, fn) {
    const arr = this.listeners.get(method) || [];
    arr.push(fn);
    this.listeners.set(method, arr);
  }
  once(method) {
    return new Promise((resolve) => {
      const off = this.on(method, (p) => {
        this.listeners.set(method, (this.listeners.get(method) || []).filter((f) => f !== off));
        resolve(p);
      });
    });
  }
  async evaluate(expression, sessionId) {
    const res = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
    if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description || 'eval failed');
    return res.result?.value;
  }
}

async function main() {
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
  await cdp.send('Network.enable', {}, page);

  cdp.on('Page.frameNavigated', (p) => {
    if (!p.frame.parentId) cdp.navigations.push(p.frame.url);
  });
  cdp.on('Runtime.executionContextsCleared', () => cdp.navigations.push('<contexts cleared>'));
  cdp.on('Network.requestWillBeSent', (p) => {
    if (p.type === 'Document') cdp.navigations.push(`<doc request ${p.request.url}>`);
  });

  console.log('1. open login');
  const loaded = cdp.once('Page.loadEventFired');
  await cdp.send('Page.navigate', { url: `${BASE}/web/index.php/auth/login` }, page);
  await Promise.race([loaded, sleep(30000)]);
  for (let i = 0; i < 40; i++) {
    if (await cdp.evaluate(`!!document.querySelector('input[name="username"]')`, page)) break;
    await sleep(500);
  }

  console.log('2. log in');
  const loginResult = await cdp.evaluate(
    `(() => {
      const u = document.querySelector('input[name="username"]');
      if (!u) return 'already-logged-in';
      const set = (sel, v) => { const el = document.querySelector(sel); const d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value'); d.set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
      set('input[name="username"]', 'Admin');
      set('input[name="password"]', 'admin123');
      document.querySelector('button[type="submit"]').click();
      return 'submitted';
    })()`,
    page,
  );
  console.log('  ', loginResult);
  for (let i = 0; i < 60; i++) {
    const href = await cdp.evaluate('location.href', page);
    if (!href.includes('/auth/login')) break;
    await sleep(500);
  }
  await sleep(1500);
  console.log('   at:', await cdp.evaluate('location.href', page));

  console.log('3. set a per-document marker, then CLICK the "Leave" menu item like a user');
  await cdp.evaluate(`window.__qlcDocMarker = 'doc-' + Math.random().toString(36).slice(2)`, page);
  const marker = await cdp.evaluate('window.__qlcDocMarker', page);
  const before = cdp.navigations.length;

  const box = await cdp.evaluate(
    `(() => {
      const items = Array.from(document.querySelectorAll('.oxd-main-menu-item, a[href]')).filter((a) => /leave/i.test((a.textContent || '') + (a.getAttribute('href') || '')));
      if (!items.length) {
        return { missing: true, sample: Array.from(document.querySelectorAll('a[href]')).slice(0, 10).map((a) => (a.textContent || '').trim().slice(0, 20) + '|' + a.getAttribute('href')) };
      }
      const link = items[0];
      // Click it through the DOM: for a plain <a href> this is a real document
      // navigation; for a router-intercepted link it is a pushState. The marker
      // below tells us which one actually happened.
      link.click();
      return { clicked: true, text: (link.textContent || '').trim(), href: link.getAttribute('href'), tag: link.tagName, count: items.length };
    })()`,
    page,
  );
  if (box?.missing) throw new Error(`Leave menu item not found. candidates: ${JSON.stringify(box.sample)}`);
  console.log(`   clicked "${box.text}" <${box.tag}> href=${box.href} (${box.count} matching link(s))`);
  await sleep(3500);

  const after = await cdp.evaluate(
    `JSON.stringify({ href: location.href, marker: window.__qlcDocMarker || null })`,
    page,
  );
  const state = JSON.parse(after);
  const events = cdp.navigations.slice(before);

  console.log('\nresult:');
  console.log('   url now            :', state.href);
  console.log('   marker survives    :', state.marker === marker, `(${marker} -> ${state.marker})`);
  console.log('   doc-level events   :', events.length ? events.join(', ') : '(none)');
  console.log(
    state.marker === marker
      ? '\n=> SAME-DOCUMENT navigation: chrome.devtools.network.onNavigated does NOT fire.'
      : '\n=> REAL document navigation: onNavigated fires.',
  );
  ws.close();
}

main().catch((e) => {
  console.error('nav probe failed:', e.message);
  process.exit(1);
});
