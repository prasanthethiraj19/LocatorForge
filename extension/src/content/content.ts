import { serializeElement } from '../panel/lib/locators/serialize';

interface PickMessage {
  type: 'PICK_START' | 'PICK_CANCEL';
}

let active = false;
let overlay: HTMLDivElement | null = null;

function ensureOverlay() {
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = '__qlc_overlay';
  document.documentElement.appendChild(overlay);
  return overlay;
}

function moveOverlay(target: Element) {
  const r = target.getBoundingClientRect();
  const o = ensureOverlay();
  o.style.top = window.scrollY + r.top + 'px';
  o.style.left = window.scrollX + r.left + 'px';
  o.style.width = r.width + 'px';
  o.style.height = r.height + 'px';
  o.style.display = 'block';
}

function hideOverlay() {
  if (overlay) overlay.style.display = 'none';
}

function deepTarget(e: Event): Element | null {
  const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
  for (const n of path) {
    if (n && (n as Node).nodeType === 1) return n as Element;
  }
  const t = e.target as Element | null;
  return t && t.nodeType === 1 ? t : null;
}

function onMove(e: MouseEvent) {
  if (!active) return;
  const t = deepTarget(e);
  if (t) moveOverlay(t);
}

function onClick(e: MouseEvent) {
  if (!active) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  e.stopPropagation();
  const t = deepTarget(e);
  let element: unknown = null;
  if (t) {
    try {
      element = serializeElement(t);
    } catch (err) {
      console.error('[LocatorForge] pick serialize failed', err);
      element = null;
    }
  }
  // Always exit pick mode on click — a click is a definitive action, even if it
  // landed on a non-element node (scrollbar, empty document). This guarantees
  // the overlay never lingers.
  stop();
  chrome.runtime.sendMessage({ type: 'PICK_RESULT', element, frameUrl: location.href }).catch(() => {});
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && active) {
    stop();
    chrome.runtime.sendMessage({ type: 'PICK_RESULT', element: null }).catch(() => {});
  }
}

function start() {
  if (active) return;
  active = true;
  document.addEventListener('mousemove', onMove, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKey, true);
  ensureOverlay();
}

function stop() {
  active = false;
  document.removeEventListener('mousemove', onMove, true);
  document.removeEventListener('click', onClick, true);
  document.removeEventListener('keydown', onKey, true);
  hideOverlay();
}

chrome.runtime.onMessage.addListener((msg: PickMessage) => {
  if (msg.type === 'PICK_START') start();
  else if (msg.type === 'PICK_CANCEL') stop();
});
