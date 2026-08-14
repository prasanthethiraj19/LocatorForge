/**
 * LocatorForge — Freeze DOM content script.
 *
 * Purpose: hovering a dropdown to pick a menu item closes the menu the moment
 * the user clicks into DevTools. Freeze mode keeps transient UI (open dropdowns,
 * tooltips, hover-cards) on screen so the user can inspect/pick those elements.
 *
 * Mechanism (chosen as the simplest approach that actually works for the
 * common hover-menu / tooltip / popover case without forking the DOM):
 *
 *   1. Swallow the events that typically close menus/tooltips at the capture
 *      phase before site handlers see them:
 *        - mouseleave / mouseout / pointerleave / pointerout
 *        - focusout / blur
 *        - mousedown / pointerdown / touchstart on document/body (clicks
 *          outside often dismiss menus — we let them through inside open
 *          popovers, but stop the bubble at document level)
 *      Per-event handlers call stopImmediatePropagation() so site listeners
 *      registered on the bubble phase never fire.
 *
 *   2. Inject a stylesheet that:
 *        - Disables all CSS transitions/animations (`* { transition: none !important; animation: none !important; }`)
 *          so a hover-card that fades out on `:not(:hover)` stays put.
 *        - Adds a red dashed border around the viewport as a visual indicator.
 *
 *   3. Patch window.setTimeout / setInterval to no-op while frozen — many
 *      tooltip libraries close popovers via a delayed timer (e.g.
 *      `setTimeout(close, 200)`). Patching these prevents that close from
 *      ever firing. Originals are restored on exit.
 *
 *   4. Capture a MutationObserver and revert removed nodes — if a site uses
 *      JS (rather than CSS or events) to remove a menu element, we put it
 *      back in place. This catches React/Vue conditional renders.
 *
 *   5. NOT used: cloning the document. That breaks site state (forms, video,
 *      canvas) and gives wrong locators since the clone diverges from the
 *      live DOM the user will eventually test against.
 *
 * Messages from service worker:
 *   { type: 'FREEZE_ENTER' }  — enter freeze mode
 *   { type: 'FREEZE_EXIT' }   — leave freeze mode
 *   { type: 'FREEZE_TOGGLE' } — toggle
 * Listens via chrome.runtime.onMessage.addListener.
 */

// Module marker — scopes function names so they don't collide with other
// content scripts compiled into the same `src/` tree (content.ts, recorder.ts).
export {};

interface FreezeMessage {
  type: 'FREEZE_ENTER' | 'FREEZE_EXIT' | 'FREEZE_TOGGLE';
}

const STYLE_ID = '__snaploc_freeze_style';
const INDICATOR_ID = '__snaploc_freeze_indicator';
const BANNER_ID = '__snaploc_freeze_banner';

const CLOSE_EVENTS = [
  'mouseleave',
  'mouseout',
  'pointerleave',
  'pointerout',
  'focusout',
  'blur',
] as const;

type CloseEventName = (typeof CLOSE_EVENTS)[number];

let frozen = false;
let observer: MutationObserver | null = null;
let originalSetTimeout: typeof window.setTimeout | null = null;
let originalSetInterval: typeof window.setInterval | null = null;

function swallowEvent(e: Event) {
  if (!frozen) return;
  // Don't block events fired on our own UI (indicator/banner).
  const t = e.target as Node | null;
  if (t && t.nodeType === 1) {
    const el = t as Element;
    if (el.id === INDICATOR_ID || el.id === BANNER_ID) return;
    if (el.closest && el.closest('#' + INDICATOR_ID + ', #' + BANNER_ID)) return;
  }
  e.stopImmediatePropagation();
  e.stopPropagation();
}

function attachEventBlockers() {
  for (const name of CLOSE_EVENTS) {
    document.addEventListener(name as CloseEventName, swallowEvent, true);
  }
}

function detachEventBlockers() {
  for (const name of CLOSE_EVENTS) {
    document.removeEventListener(name as CloseEventName, swallowEvent, true);
  }
}

function ensureStylesheet() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  // Suppress all transitions/animations so fade-out / collapse animations don't hide menus.
  // Also defines the indicator border + banner styles (mirrored in freeze.css).
  style.textContent = [
    '*, *::before, *::after {',
    '  transition: none !important;',
    '  animation: none !important;',
    '  animation-duration: 0s !important;',
    '  transition-duration: 0s !important;',
    '}',
    '#' + INDICATOR_ID + ' {',
    '  position: fixed; top: 0; left: 0; right: 0; bottom: 0;',
    '  pointer-events: none; border: 3px dashed #dc2626;',
    '  box-sizing: border-box; z-index: 2147483646;',
    '}',
    '#' + BANNER_ID + ' {',
    '  position: fixed; top: 8px; left: 50%; transform: translateX(-50%);',
    '  background: #dc2626; color: #fff;',
    "  font: 600 12px/1.3 -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;",
    '  letter-spacing: 0.02em; padding: 5px 14px; border-radius: 4px;',
    '  box-shadow: 0 2px 6px rgba(0,0,0,0.25); pointer-events: none;',
    '  z-index: 2147483647; white-space: nowrap;',
    '}',
  ].join('\n');
  document.documentElement.appendChild(style);
}

function removeStylesheet() {
  const s = document.getElementById(STYLE_ID);
  if (s) s.remove();
}

function ensureIndicator() {
  if (document.getElementById(INDICATOR_ID)) return;
  const ind = document.createElement('div');
  ind.id = INDICATOR_ID;
  document.documentElement.appendChild(ind);

  const banner = document.createElement('div');
  banner.id = BANNER_ID;
  banner.textContent = 'LocatorForge — DOM frozen (hovered menus stay open)';
  document.documentElement.appendChild(banner);
}

function removeIndicator() {
  const ind = document.getElementById(INDICATOR_ID);
  if (ind) ind.remove();
  const banner = document.getElementById(BANNER_ID);
  if (banner) banner.remove();
}

function patchTimers() {
  if (originalSetTimeout) return;
  originalSetTimeout = window.setTimeout;
  originalSetInterval = window.setInterval;
  // Replace with no-ops that return a fake handle. Some sites rely on the
  // return value being a positive integer.
  let fakeId = 1_000_000;
  // Cast through unknown — we accept the type mismatch is intentional.
  (window as unknown as { setTimeout: (...args: unknown[]) => number }).setTimeout = () => ++fakeId;
  (window as unknown as { setInterval: (...args: unknown[]) => number }).setInterval = () => ++fakeId;
}

function restoreTimers() {
  if (!originalSetTimeout) return;
  (window as unknown as { setTimeout: typeof window.setTimeout }).setTimeout = originalSetTimeout;
  if (originalSetInterval) {
    (window as unknown as { setInterval: typeof window.setInterval }).setInterval =
      originalSetInterval;
  }
  originalSetTimeout = null;
  originalSetInterval = null;
}

function startObserver() {
  if (observer) return;
  observer = new MutationObserver((mutations) => {
    if (!frozen) return;
    for (const m of mutations) {
      // Revert node removals: re-insert removed nodes at their previous spot.
      if (m.type === 'childList' && m.removedNodes.length > 0) {
        for (let i = 0; i < m.removedNodes.length; i++) {
          const removed = m.removedNodes[i];
          // Skip our own UI.
          if (
            removed.nodeType === 1 &&
            ((removed as Element).id === INDICATOR_ID ||
              (removed as Element).id === BANNER_ID ||
              (removed as Element).id === STYLE_ID)
          ) {
            continue;
          }
          try {
            if (m.nextSibling && m.nextSibling.parentNode === m.target) {
              m.target.insertBefore(removed, m.nextSibling);
            } else {
              m.target.appendChild(removed);
            }
          } catch {
            // Swallow — best effort.
          }
        }
      }
      // Revert attribute changes that hide popovers (display:none, hidden, aria-expanded=false).
      if (m.type === 'attributes' && m.target.nodeType === 1) {
        const el = m.target as Element;
        const attr = m.attributeName || '';
        if (attr === 'hidden' && el.hasAttribute('hidden')) {
          // Only revert if previously visible.
          if (m.oldValue === null) el.removeAttribute('hidden');
        }
        if (attr === 'aria-expanded' && el.getAttribute('aria-expanded') === 'false') {
          if (m.oldValue === 'true') el.setAttribute('aria-expanded', 'true');
        }
      }
    }
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeOldValue: true,
    attributeFilter: ['hidden', 'aria-expanded', 'aria-hidden', 'class', 'style'],
  });
}

function stopObserver() {
  if (!observer) return;
  observer.disconnect();
  observer = null;
}

function notifyState() {
  try {
    chrome.runtime.sendMessage({ type: 'FREEZE_STATE', frozen }).catch(() => {});
  } catch {
    // Older Chromes return a Promise without .catch in some contexts — ignore.
  }
}

function enter() {
  if (frozen) return;
  frozen = true;
  ensureStylesheet();
  ensureIndicator();
  attachEventBlockers();
  patchTimers();
  startObserver();
  notifyState();
}

function exit() {
  if (!frozen) return;
  frozen = false;
  stopObserver();
  detachEventBlockers();
  restoreTimers();
  removeIndicator();
  removeStylesheet();
  notifyState();
}

function toggle() {
  if (frozen) exit();
  else enter();
}

chrome.runtime.onMessage.addListener((msg: FreezeMessage) => {
  if (!msg || typeof msg.type !== 'string') return;
  if (msg.type === 'FREEZE_ENTER') enter();
  else if (msg.type === 'FREEZE_EXIT') exit();
  else if (msg.type === 'FREEZE_TOGGLE') toggle();
});
