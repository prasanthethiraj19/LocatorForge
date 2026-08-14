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

function uniqueCssPath(node: Element): string {
  if (node.id && document.querySelectorAll('#' + CSS.escape(node.id)).length === 1) {
    return '#' + CSS.escape(node.id);
  }
  const parts: string[] = [];
  let cur: Element | null = node;
  while (cur && cur.nodeType === 1 && cur !== document.body) {
    const elNode: Element = cur;
    let s = elNode.tagName.toLowerCase();
    const id = (elNode as HTMLElement).id;
    if (id && document.querySelectorAll('#' + CSS.escape(id)).length === 1) {
      parts.unshift('#' + CSS.escape(id));
      return parts.join(' > ');
    }
    const parent: HTMLElement | null = elNode.parentElement;
    if (parent) {
      const sib: Element[] = Array.from(parent.children).filter(
        (c: Element) => c.tagName === elNode.tagName,
      );
      if (sib.length > 1) s += ':nth-of-type(' + (sib.indexOf(elNode) + 1) + ')';
    }
    parts.unshift(s);
    cur = parent;
  }
  return parts.join(' > ') || node.tagName.toLowerCase();
}

function onMove(e: MouseEvent) {
  if (!active) return;
  const t = e.target as Element | null;
  if (t && t.nodeType === 1) moveOverlay(t);
}

function onClick(e: MouseEvent) {
  if (!active) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  e.stopPropagation();
  const t = e.target as Element | null;
  if (!t) return;
  const path = uniqueCssPath(t);
  stop();
  chrome.runtime.sendMessage({ type: 'PICK_RESULT', element: { cssPath: path } }).catch(() => {});
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
