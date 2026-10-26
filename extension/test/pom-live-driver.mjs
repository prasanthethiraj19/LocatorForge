/**
 * Live driver — walks the real OrangeHRM demo site over CDP, injects the bundled
 * LocatorForge panel pipeline (`test/pom-live.js`) on every page, harvests real
 * elements, and writes one raw JSON per page into `test/pom-live/raw/`.
 *
 * Usage: node test/pom-live-driver.mjs <cdpPort> [outDir]
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const port = Number(process.argv[2] || 0);
const outDir = resolve(process.argv[3] || join(here, 'pom-live'));
if (!port) throw new Error('usage: node pom-live-driver.mjs <cdpPort> [outDir]');

const BASE = 'https://opensource-demo.orangehrmlive.com';
const FRAMEWORK = 'playwright-ts';

const PAGES = [
  {
    slug: 'login',
    url: `${BASE}/web/index.php/auth/login`,
    ready: 'input[name="username"]',
    selectors: [
      'input[name="username"]',
      'input[name="password"]',
      'button[type="submit"]',
      '.orangehrm-login-forgot-header',
      '.orangehrm-login-branding img',
      '.orangehrm-login-footer-sm a',
    ],
    login: true,
  },
  {
    slug: 'dashboard',
    url: `${BASE}/web/index.php/dashboard/index`,
    ready: '.oxd-topbar-header-breadcrumb',
    selectors: [
      '.oxd-topbar-header-breadcrumb h6',
      'input[placeholder="Search"]',
      '.oxd-main-menu-item',
      '.oxd-userdropdown-tab',
      '.oxd-brand-banner img',
      '.oxd-dashboard-grid .oxd-grid-item',
    ],
  },
  {
    slug: 'pim-employees',
    url: `${BASE}/web/index.php/pim/viewEmployeeList`,
    ready: '.oxd-table',
    selectors: [
      '.oxd-topbar-header-breadcrumb h6',
      'input[placeholder="Type for hints..."]',
      '.oxd-input--active',
      '.oxd-button--secondary',
      '.oxd-table-header',
      '.oxd-table-body .oxd-table-row',
    ],
  },
  {
    slug: 'leave-list',
    url: `${BASE}/web/index.php/leave/viewLeaveList`,
    ready: '.oxd-topbar-header-breadcrumb',
    selectors: [
      '.oxd-topbar-header-breadcrumb h6',
      '.oxd-button--secondary',
      '.oxd-table-header',
      '.oxd-table-body .oxd-table-row',
      'input[placeholder="yyyy-dd-mm"]',
    ],
  },
  {
    slug: 'admin-users',
    url: `${BASE}/web/index.php/admin/viewSystemUsers`,
    ready: '.oxd-table',
    selectors: [
      '.oxd-topbar-header-breadcrumb h6',
      'input[placeholder="Type for hints..."]',
      '.oxd-button--secondary',
      '.oxd-table-header',
      '.oxd-table-body .oxd-table-row',
      '.oxd-select-text',
    ],
  },
];

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
      const fns = this.listeners.get(msg.method);
      if (fns) for (const fn of [...fns]) fn(msg.params);
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error(`${method} timed out`));
      }, 45000);
    });
  }

  on(method, fn) {
    const arr = this.listeners.get(method) || [];
    arr.push(fn);
    this.listeners.set(method, arr);
    return () => this.listeners.set(method, arr.filter((f) => f !== fn));
  }

  once(method) {
    return new Promise((resolve) => {
      const off = this.on(method, (params) => {
        off();
        resolve(params);
      });
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description || 'eval failed');
    }
    return res.result?.value;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function targetWsUrl() {
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(500);
  }
  throw new Error('no CDP page target found');
}

async function connect() {
  const url = await targetWsUrl();
  const ws = new WebSocket(url);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', () => reject(new Error('ws error')), { once: true });
  });
  return new Cdp(ws);
}

async function navigate(cdp, url, readySelector) {
  const loaded = cdp.once('Page.loadEventFired');
  await cdp.send('Page.navigate', { url });
  await Promise.race([loaded, sleep(30000)]);
  for (let i = 0; i < 60; i++) {
    try {
      const ok = await cdp.evaluate(
        `!!document.querySelector(${JSON.stringify(readySelector)})`,
      );
      if (ok) return true;
    } catch {}
    await sleep(500);
  }
  console.warn(`  ! ready selector never appeared: ${readySelector}`);
  return false;
}

function harvestExpr(page) {
  return `(() => {
    try {
      const r = window.__qlcHarvest(${JSON.stringify(page.selectors)}, ${JSON.stringify(FRAMEWORK)}, location.href);
      return JSON.stringify(r);
    } catch (e) { return JSON.stringify({ error: String(e && e.stack || e) }); }
  })()`;
}

const LOGIN_EXPR = `(() => {
  const set = (sel, val) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    if (d && d.set) d.set.call(el, val); else el.value = val;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  };
  const u = set('input[name="username"]', 'Admin');
  const p = set('input[name="password"]', 'admin123');
  const b = document.querySelector('button[type="submit"]');
  if (b) b.click();
  return JSON.stringify({ u, p, clicked: !!b });
})()`;

async function main() {
  const cdp = await connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');
  await cdp.send('Network.clearBrowserCookies');
  await cdp.send('Storage.clearDataForOrigin', { origin: BASE, storageTypes: 'all' });

  const bundle = await readFile(join(here, 'pom-live.js'), 'utf8');
  await mkdir(join(outDir, 'raw'), { recursive: true });

  const summary = [];

  for (const page of PAGES) {
    console.log(`\n== ${page.slug}`);
    await navigate(cdp, page.url, page.ready);
    await sleep(1200);

    const pageUrl = await cdp.evaluate('location.href');
    await cdp.evaluate(bundle);

    const raw = await cdp.evaluate(harvestExpr(page));
    const result = JSON.parse(raw);
    if (result.error) {
      console.error(`  ! harvest error: ${result.error}`);
      continue;
    }
    result.requestedUrl = page.url;
    result.capturedUrl = pageUrl;
    await writeFile(join(outDir, 'raw', `${page.slug}.json`), JSON.stringify(result, null, 2), 'utf8');
    console.log(`  captured: ${pageUrl}`);
    console.log(`  class: ${result.className}`);
    console.log(`  fields: ${result.fieldNames.join(', ') || '(none)'}`);
    console.log(`  kinds: ${result.kinds.join(', ')}`);
    if (result.skipped.length) console.log(`  skipped: ${result.skipped.join(' | ')}`);
    summary.push({ slug: page.slug, url: pageUrl, className: result.className, fields: result.fieldNames });

    if (page.login) {
      console.log('  logging in: Admin/admin123');
      await cdp.evaluate(LOGIN_EXPR);
      const ok = await (async () => {
        for (let i = 0; i < 60; i++) {
          const href = await cdp.evaluate('location.href');
          if (!href.includes('/auth/login')) return href;
          await sleep(500);
        }
        return null;
      })();
      console.log(`  -> ${ok || 'login did not navigate'}`);
      if (!ok) break;
      await sleep(1500);
    }
  }

  await writeFile(
    join(outDir, 'raw', '_summary.json'),
    JSON.stringify(summary, null, 2),
    'utf8',
  );
  console.log('\nsummary written.');
  cdp.ws.close();
}

main().catch((e) => {
  console.error('driver failed:', e.message);
  process.exit(1);
});
