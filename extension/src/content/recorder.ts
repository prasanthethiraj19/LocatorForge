/**
 * LocatorForge Action Recorder — content script.
 *
 * Listens for user clicks, double-clicks, text input, and <select> changes
 * on the inspected page. For each captured event it serializes the target
 * element (matching the structure of SerializedElement in panel/lib/locators/types)
 * and dispatches a REC_EVENT message to the service worker, which forwards
 * to the panel.
 *
 * This file is the recorder twin of `content.ts` (which handles element
 * picking). It is loaded by the service worker on demand. Wiring lives in
 * the SW (REC_START / REC_STOP messages).
 *
 * Build note: this entry needs to be added to `scripts/build.mjs` by the
 * main thread (esbuild as `recorder.js`, format `iife`).
 */

interface RecorderRuntimeMessage {
  type: 'REC_START' | 'REC_STOP';
}

let recording = false;
let indicator: HTMLDivElement | null = null;
let lastInputElement: HTMLElement | null = null;
let lastInputValue = '';
let inputDebounceTimer: number | null = null;

const INPUT_DEBOUNCE_MS = 350;

function ensureIndicator(): HTMLDivElement {
  if (indicator) return indicator;
  indicator = document.createElement('div');
  indicator.id = '__qlc_recorder_dot';
  indicator.setAttribute('aria-hidden', 'true');
  document.documentElement.appendChild(indicator);
  return indicator;
}

function showIndicator() {
  ensureIndicator().style.display = 'block';
}

function hideIndicator() {
  if (indicator) indicator.style.display = 'none';
}

/* ── Serialization (kept in sync with lib/locators/serialize.ts) ────── */

function attrsOf(node: Element): Record<string, string> {
  const out: Record<string, string> = {};
  const attrs = node.attributes;
  for (let i = 0; i < attrs.length; i++) {
    const a = attrs[i];
    out[a.name] = a.value;
  }
  return out;
}

function shadowHostOf(node: Element): Element | null {
  const root = node.getRootNode ? (node.getRootNode() as ShadowRoot | Document) : null;
  if (root && root !== document && (root as ShadowRoot).host) return (root as ShadowRoot).host as Element;
  return null;
}

function isSvg(node: Element): boolean {
  return node.namespaceURI === 'http://www.w3.org/2000/svg';
}

function bestSelectorForHost(host: Element): string {
  const id = (host as HTMLElement).id;
  if (id) {
    try {
      if (document.querySelectorAll('#' + CSS.escape(id)).length === 1) return '#' + CSS.escape(id);
    } catch {}
  }
  const ds = host.getAttribute('data-testid');
  if (ds) return `[data-testid=${JSON.stringify(ds)}]`;
  return host.tagName.toLowerCase();
}

function buildShadowChain(node: Element): string[] {
  const chain: string[] = [];
  let cur: Element | null = node;
  let safety = 0;
  while (cur && safety++ < 50) {
    const host = shadowHostOf(cur);
    if (!host) break;
    chain.unshift(bestSelectorForHost(host));
    cur = host;
  }
  return chain;
}

function buildFrameChain(): string[] {
  const chain: string[] = [];
  try {
    let w: Window = window;
    let safety = 0;
    while (w !== w.parent && safety++ < 20) {
      const f = w.frameElement as HTMLElement | null;
      if (!f) break;
      let sel: string;
      if (f.id) sel = '#' + CSS.escape(f.id);
      else if (f.getAttribute('name')) sel = `iframe[name=${JSON.stringify(f.getAttribute('name'))}]`;
      else sel = 'iframe';
      chain.unshift(sel);
      w = w.parent;
    }
  } catch {
    chain.push('iframe');
  }
  return chain;
}

function getCss(node: Element): string {
  const parts: string[] = [];
  let cur: Element | null = node;
  let safety = 0;
  while (cur && cur.nodeType === 1 && cur !== document.body && safety++ < 100) {
    if (shadowHostOf(cur)) break;
    let s = cur.tagName.toLowerCase();
    const id = (cur as HTMLElement).id;
    if (id) {
      try {
        if (document.querySelectorAll('#' + CSS.escape(id)).length === 1) {
          parts.unshift('#' + CSS.escape(id));
          return parts.join(' > ');
        }
      } catch {}
    }
    const parent: Element | null = cur.parentElement;
    if (parent) {
      const sib = Array.from(parent.children).filter((c) => c.tagName === cur!.tagName);
      if (sib.length > 1) s += `:nth-of-type(${sib.indexOf(cur) + 1})`;
    }
    parts.unshift(s);
    cur = parent;
  }
  return parts.join(' > ') || node.tagName.toLowerCase();
}

function getXPathStructural(node: Element): string {
  const id = (node as HTMLElement).id;
  if (id) {
    try {
      if (document.querySelectorAll(`[id=${JSON.stringify(id)}]`).length === 1) {
        return `//*[@id=${JSON.stringify(id)}]`;
      }
    } catch {}
  }
  const parts: string[] = [];
  let cur: Element | null = node;
  let safety = 0;
  while (cur && cur.nodeType === 1 && safety++ < 100) {
    if (shadowHostOf(cur)) break;
    const parent: Element | null = cur.parentElement;
    if (!parent || parent.nodeType !== 1) {
      parts.unshift(cur.tagName.toLowerCase());
      break;
    }
    const sib = Array.from(parent.children).filter((c) => c.tagName === cur!.tagName);
    const idx = sib.indexOf(cur) + 1;
    parts.unshift(cur.tagName.toLowerCase() + (sib.length > 1 ? `[${idx}]` : ''));
    cur = parent;
  }
  return '//' + parts.join('/');
}

function getXPathAbsolute(node: Element): string {
  const parts: string[] = [];
  let cur: Element | null = node;
  let safety = 0;
  while (cur && cur.nodeType === 1 && safety++ < 100) {
    if (shadowHostOf(cur)) break;
    const parent: Element | null = cur.parentElement;
    if (!parent || parent.nodeType !== 1) {
      parts.unshift(cur.tagName.toLowerCase());
      break;
    }
    const sib = Array.from(parent.children).filter((c) => c.tagName === cur!.tagName);
    const idx = sib.indexOf(cur) + 1;
    parts.unshift(cur.tagName.toLowerCase() + `[${idx}]`);
    cur = parent;
  }
  return '/' + parts.join('/');
}

function getXPathPosition(node: Element): string {
  const parts: string[] = [];
  let cur: Element | null = node;
  let safety = 0;
  while (cur && cur.nodeType === 1 && cur.tagName.toLowerCase() !== 'html' && safety++ < 100) {
    const parent: Element | null = cur.parentElement;
    if (!parent || parent.nodeType !== 1) break;
    const idx = Array.prototype.indexOf.call(parent.children, cur) + 1;
    parts.unshift(`${cur.tagName.toLowerCase()}[position()=${idx}]`);
    cur = parent;
  }
  return '//' + parts.join('/');
}

function findAncestorAnchor(node: Element): { selector: string; tag: string } | null {
  let cur: Element | null = node.parentElement;
  let safety = 0;
  while (cur && cur !== document.body && safety++ < 50) {
    const id = (cur as HTMLElement).id;
    if (id) {
      try {
        if (document.querySelectorAll('#' + CSS.escape(id)).length === 1) {
          return { selector: '#' + CSS.escape(id), tag: cur.tagName.toLowerCase() };
        }
      } catch {}
    }
    const role = cur.getAttribute('role');
    if (role === 'main' || role === 'navigation' || role === 'form' || role === 'dialog') {
      return { selector: `[role=${JSON.stringify(role)}]`, tag: cur.tagName.toLowerCase() };
    }
    const t = cur.tagName.toLowerCase();
    if (t === 'main' || t === 'nav' || t === 'form' || t === 'dialog' || t === 'header' || t === 'footer' || t === 'aside') {
      return { selector: t, tag: t };
    }
    cur = cur.parentElement;
  }
  return null;
}

function visibleTextOf(node: Element): string {
  return (node.textContent || '').replace(/\s+/g, ' ').trim();
}

function findLabelText(node: Element): string {
  const id = (node as HTMLElement).id;
  if (id) {
    try {
      const lab = document.querySelector(`label[for=${JSON.stringify(id)}]`);
      if (lab) return visibleTextOf(lab);
    } catch {}
  }
  let p: Element | null = node.parentElement;
  while (p) {
    if (p.tagName && p.tagName.toLowerCase() === 'label') return visibleTextOf(p);
    p = p.parentElement;
  }
  return '';
}

function ariaLabelledByText(a: Record<string, string>): string {
  const ids = (a['aria-labelledby'] || '').split(/\s+/).filter(Boolean);
  if (!ids.length) return '';
  return ids
    .map((id) => {
      const r = document.getElementById(id);
      return r ? visibleTextOf(r) : '';
    })
    .filter(Boolean)
    .join(' ');
}

function serializeElement(el: Element): unknown {
  const a = attrsOf(el);
  const tag = el.tagName.toLowerCase();
  const text = visibleTextOf(el);
  let directText = '';
  el.childNodes.forEach((n) => {
    if (n.nodeType === 3) directText += n.textContent || '';
  });
  directText = directText.replace(/\s+/g, ' ').trim();

  const testIds: Record<string, string> = {};
  for (const key of Object.keys(a)) {
    if (/^data-(testid|test-id|qa|qa-id|cy|test)$/i.test(key)) testIds[key] = a[key];
  }

  const shadowChain = buildShadowChain(el);
  const frameChain = buildFrameChain();
  const anchor = findAncestorAnchor(el);
  const anchorOut = anchor ? { selector: anchor.selector, chain: anchor.selector } : null;

  return {
    tag,
    attrs: a,
    textContent: text,
    visibleText: directText || text,
    alt: a.alt || '',
    title: a.title || '',
    placeholder: a.placeholder || '',
    ariaLabel: a['aria-label'] || '',
    ariaLabelledByText: ariaLabelledByText(a),
    labelText: findLabelText(el),
    role: a.role || '',
    testIds,
    cssPath: getCss(el),
    xpath: getXPathStructural(el),
    xpathAbsolute: getXPathAbsolute(el),
    xpathPosition: getXPathPosition(el),
    ancestorAnchor: anchorOut,
    shadowChain,
    frameChain,
    isSvg: isSvg(el),
    inShadowRoot: shadowChain.length > 0,
    inIframe: frameChain.length > 0,
  };
}

/* ── Event capture ──────────────────────────────────────────────────── */

type Action = 'click' | 'dblclick' | 'fill' | 'select' | 'press';

function send(action: Action, target: Element, value?: string) {
  const element = serializeElement(target);
  const step = {
    action,
    element,
    value,
    timestamp: Date.now(),
  };
  try {
    chrome.runtime.sendMessage({ type: 'REC_EVENT', step }).catch(() => {});
  } catch {}
}

function isEditable(el: Element): el is HTMLInputElement | HTMLTextAreaElement {
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'textarea') return true;
  if (tag === 'input') {
    const type = ((el as HTMLInputElement).type || 'text').toLowerCase();
    return !['button', 'submit', 'reset', 'image', 'checkbox', 'radio', 'file', 'range', 'color'].includes(type);
  }
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

function flushPendingInput() {
  if (inputDebounceTimer !== null) {
    window.clearTimeout(inputDebounceTimer);
    inputDebounceTimer = null;
  }
  if (lastInputElement) {
    send('fill', lastInputElement, lastInputValue);
    lastInputElement = null;
    lastInputValue = '';
  }
}

function onClick(e: MouseEvent) {
  if (!recording) return;
  const t = e.target as Element | null;
  if (!t || t.nodeType !== 1) return;
  if (e.detail >= 2) return; // dblclick handler will cover this
  flushPendingInput();
  send('click', t);
}

function onDblClick(e: MouseEvent) {
  if (!recording) return;
  const t = e.target as Element | null;
  if (!t || t.nodeType !== 1) return;
  flushPendingInput();
  send('dblclick', t);
}

function onInput(e: Event) {
  if (!recording) return;
  const t = e.target as Element | null;
  if (!t || t.nodeType !== 1) return;
  if (!isEditable(t)) return;
  const val =
    (t as HTMLInputElement | HTMLTextAreaElement).value !== undefined
      ? (t as HTMLInputElement).value
      : (t as HTMLElement).textContent || '';

  // Coalesce: if same field, just update; if different field, flush previous.
  if (lastInputElement && lastInputElement !== t) {
    flushPendingInput();
  }
  lastInputElement = t as HTMLElement;
  lastInputValue = val;

  if (inputDebounceTimer !== null) window.clearTimeout(inputDebounceTimer);
  inputDebounceTimer = window.setTimeout(flushPendingInput, INPUT_DEBOUNCE_MS);
}

function onChange(e: Event) {
  if (!recording) return;
  const t = e.target as Element | null;
  if (!t || t.nodeType !== 1) return;
  if (t.tagName.toLowerCase() === 'select') {
    flushPendingInput();
    const sel = t as HTMLSelectElement;
    const opt = sel.options[sel.selectedIndex];
    const value = opt ? (opt.textContent || opt.value).trim() : sel.value;
    send('select', t, value);
  }
}

function onKeyDown(e: KeyboardEvent) {
  if (!recording) return;
  // Capture meaningful keypresses on focused element. Skip plain typing,
  // which is already covered by `input`.
  const interesting = ['Enter', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  if (!interesting.includes(e.key)) return;
  const t = (e.target as Element) || document.activeElement;
  if (!t || t.nodeType !== 1) return;
  if (e.key === 'Enter') flushPendingInput();
  send('press', t as Element, e.key);
}

function onBlur() {
  if (!recording) return;
  flushPendingInput();
}

function attach() {
  document.addEventListener('click', onClick, true);
  document.addEventListener('dblclick', onDblClick, true);
  document.addEventListener('input', onInput, true);
  document.addEventListener('change', onChange, true);
  document.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('blur', onBlur, true);
}

function detach() {
  document.removeEventListener('click', onClick, true);
  document.removeEventListener('dblclick', onDblClick, true);
  document.removeEventListener('input', onInput, true);
  document.removeEventListener('change', onChange, true);
  document.removeEventListener('keydown', onKeyDown, true);
  window.removeEventListener('blur', onBlur, true);
}

function start() {
  if (recording) return;
  recording = true;
  attach();
  showIndicator();
}

function stop() {
  if (!recording) return;
  flushPendingInput();
  recording = false;
  detach();
  hideIndicator();
}

chrome.runtime.onMessage.addListener((msg: RecorderRuntimeMessage) => {
  if (msg.type === 'REC_START') start();
  else if (msg.type === 'REC_STOP') stop();
});

// Force this file to be treated as a module so its top-level identifiers
// (start, stop, onClick, etc.) do not collide with content.ts in the
// TypeScript global script scope. esbuild still emits it as IIFE.
export {};
