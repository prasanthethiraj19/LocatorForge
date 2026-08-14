import { PORT_NAME, type PanelToWorker, type WorkerToPanel, type ContentToWorker } from '../panel/lib/messaging/protocol';
import {
  RECORDER_PORT_NAME,
  type PanelToWorkerRecorder,
  type WorkerToPanelRecorder,
  type RecorderEvent,
} from '../panel/lib/recorder/types';

/* ────────────────────────── panel port (pick + freeze) ────────────────────────── */

const panels = new Map<number, Set<chrome.runtime.Port>>();

function trackPanel(tabId: number, port: chrome.runtime.Port) {
  let set = panels.get(tabId);
  if (!set) {
    set = new Set();
    panels.set(tabId, set);
  }
  set.add(port);
}

function untrackPanel(port: chrome.runtime.Port) {
  for (const [tabId, set] of panels) {
    set.delete(port);
    if (set.size === 0) panels.delete(tabId);
  }
}

function broadcastPanel(tabId: number, msg: WorkerToPanel) {
  const set = panels.get(tabId);
  if (!set) return;
  set.forEach((p) => { try { p.postMessage(msg); } catch {} });
}

async function ensureContent(tabId: number, file: string): Promise<void> {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: [file] });
  } catch {
    // best-effort — content may already be present
  }
}

/* ────────────────────────── recorder port ────────────────────────── */

const recorders = new Map<number, Set<chrome.runtime.Port>>();

function trackRecorder(tabId: number, port: chrome.runtime.Port) {
  let set = recorders.get(tabId);
  if (!set) {
    set = new Set();
    recorders.set(tabId, set);
  }
  set.add(port);
}

function untrackRecorder(port: chrome.runtime.Port) {
  for (const [tabId, set] of recorders) {
    set.delete(port);
    if (set.size === 0) recorders.delete(tabId);
  }
}

function broadcastRecorder(tabId: number, msg: WorkerToPanelRecorder) {
  const set = recorders.get(tabId);
  if (!set) return;
  set.forEach((p) => { try { p.postMessage(msg); } catch {} });
}

/* ────────────────────────── port connections ────────────────────────── */

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === PORT_NAME) {
    port.onMessage.addListener((msg: PanelToWorker) => {
      if (msg.type === 'PICK_START') {
        trackPanel(msg.tabId, port);
        chrome.tabs.sendMessage(msg.tabId, { type: 'PICK_START' }).catch(() => {
          ensureContent(msg.tabId, 'content.js').then(() =>
            chrome.tabs.sendMessage(msg.tabId, { type: 'PICK_START' }).catch(() => {
              const reply: WorkerToPanel = { type: 'PICK_CANCELLED' };
              try { port.postMessage(reply); } catch {}
            }),
          );
        });
      } else if (msg.type === 'PICK_CANCEL') {
        chrome.tabs.sendMessage(msg.tabId, { type: 'PICK_CANCEL' }).catch(() => {});
      } else if (msg.type === 'FREEZE_TOGGLE') {
        trackPanel(msg.tabId, port);
        chrome.tabs.sendMessage(msg.tabId, { type: 'FREEZE_TOGGLE' }).catch(() => {
          ensureContent(msg.tabId, 'freeze.js').then(() =>
            chrome.tabs.sendMessage(msg.tabId, { type: 'FREEZE_TOGGLE' }).catch(() => {}),
          );
        });
      }
    });
    port.onDisconnect.addListener(() => untrackPanel(port));
    return;
  }

  if (port.name === RECORDER_PORT_NAME) {
    port.onMessage.addListener((msg: PanelToWorkerRecorder) => {
      if (msg.type === 'REC_START') {
        trackRecorder(msg.tabId, port);
        ensureContent(msg.tabId, 'recorder.js').then(() =>
          chrome.tabs.sendMessage(msg.tabId, { type: 'REC_START' })
            .then(() => broadcastRecorder(msg.tabId, { type: 'REC_STARTED' }))
            .catch(() => {}),
        );
      } else if (msg.type === 'REC_STOP') {
        chrome.tabs.sendMessage(msg.tabId, { type: 'REC_STOP' })
          .then(() => broadcastRecorder(msg.tabId, { type: 'REC_STOPPED' }))
          .catch(() => {});
      }
    });
    port.onDisconnect.addListener(() => untrackRecorder(port));
    return;
  }
});

/* ────────────────────────── content → SW messages ────────────────────────── */

chrome.runtime.onMessage.addListener((msg: ContentToWorker | RecorderEvent, sender) => {
  const tabId = sender.tab?.id;
  if (!tabId) return;

  if (msg.type === 'PICK_RESULT') {
    broadcastPanel(tabId, { type: 'PICK_RESULT', element: msg.element });
  } else if (msg.type === 'FREEZE_STATE') {
    broadcastPanel(tabId, { type: 'FREEZE_STATE', frozen: msg.frozen });
  } else if (msg.type === 'REC_EVENT') {
    broadcastRecorder(tabId, { type: 'REC_EVENT', step: msg.step });
  }
});

/* ────────────────────────── keyboard commands ────────────────────────── */

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  if (command === 'snaplocator-toggle-freeze') {
    chrome.tabs.sendMessage(tab.id, { type: 'FREEZE_TOGGLE' }).catch(() => {
      ensureContent(tab.id!, 'freeze.js').then(() =>
        chrome.tabs.sendMessage(tab.id!, { type: 'FREEZE_TOGGLE' }).catch(() => {}),
      );
    });
  } else if (command === 'snaplocator-toggle-record') {
    // Without an open panel the SW has no concept of recording state. Best we can
    // do: post a one-shot message to the content script and let the panel hook
    // observe REC_EVENTs once user opens it.
    ensureContent(tab.id, 'recorder.js').then(() =>
      chrome.tabs.sendMessage(tab.id!, { type: 'REC_START' }).catch(() => {}),
    );
  } else if (command === 'snaplocator-open-side-panel') {
    try {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    } catch {}
  }
});

/* ────────────────────────── side panel + action button ────────────────────────── */

chrome.runtime.onInstalled.addListener(() => {
  try {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch {}

  // Context menu: right-click any element on the page → copy as Playwright TS.
  try {
    chrome.contextMenus.create({
      id: 'snaplocator-copy-playwright',
      title: 'LocatorForge: copy as Playwright TS',
      contexts: ['all'],
    });
    chrome.contextMenus.create({
      id: 'snaplocator-copy-selenium',
      title: 'LocatorForge: copy as Selenium Java',
      contexts: ['all'],
    });
    chrome.contextMenus.create({
      id: 'snaplocator-open-side-panel',
      title: 'LocatorForge: open side panel',
      contexts: ['all'],
    });
  } catch {}
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  if (info.menuItemId === 'snaplocator-open-side-panel') {
    try { await chrome.sidePanel.open({ windowId: tab.windowId }); } catch {}
    return;
  }

  // For copy-as actions, we ask the content script (via inspectedWindow-style eval
  // running in the page) to identify the right-clicked element and emit a locator.
  // Implementation note: contextMenus only gives us a hint (linkUrl, srcUrl, selectionText),
  // not the DOM node. For now we fall back to opening the side panel and letting the user
  // pick — true right-click integration requires a content-script picker that hooks
  // contextmenu events. Tracked as a follow-up.
  try {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  } catch {}
});
