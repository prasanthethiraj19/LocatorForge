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

import { serializeElement } from '../panel/lib/locators/serialize';

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
  // Only the top frame renders the recording dot.
  if (window !== window.top) return;
  ensureIndicator().style.display = 'block';
}

function hideIndicator() {
  if (indicator) indicator.style.display = 'none';
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

// Shadow DOM retargets events to the host, so resolve the real node from the
// composed path before serializing the recorded target.
function deepTarget(e: Event): Element | null {
  const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
  for (const n of path) {
    if (n && (n as Node).nodeType === 1) return n as Element;
  }
  const t = e.target as Element | null;
  return t && t.nodeType === 1 ? t : null;
}

function onClick(e: MouseEvent) {
  if (!recording) return;
  const t = deepTarget(e);
  if (!t) return;
  if (e.detail >= 2) return; // dblclick handler will cover this
  flushPendingInput();
  send('click', t);
}

function onDblClick(e: MouseEvent) {
  if (!recording) return;
  const t = deepTarget(e);
  if (!t) return;
  flushPendingInput();
  send('dblclick', t);
}

function onInput(e: Event) {
  if (!recording) return;
  const t = deepTarget(e);
  if (!t) return;
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
  const t = deepTarget(e);
  if (!t) return;
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
  const t = deepTarget(e) || (document.activeElement as Element | null);
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

// Force this file to be treated as a module so its top-level identifiers
// (start, stop, onClick, etc.) do not collide with content.ts in the
// TypeScript global script scope. esbuild still emits it as IIFE.
export {};

// Register only once even if the SW re-injects this file (static content-script
// registration + on-demand executeScript fallback can both load it).
if (!(window as unknown as { __qlcRecorderLoaded?: boolean }).__qlcRecorderLoaded) {
  (window as unknown as { __qlcRecorderLoaded: boolean }).__qlcRecorderLoaded = true;
  chrome.runtime.onMessage.addListener((msg: RecorderRuntimeMessage) => {
    if (msg.type === 'REC_START') start();
    else if (msg.type === 'REC_STOP') stop();
  });
}
