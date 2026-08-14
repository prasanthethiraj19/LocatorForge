import { useCallback, useEffect, useRef, useState } from 'react';
import { PORT_NAME, type WorkerToPanel } from '../lib/messaging/protocol';

/**
 * useFreeze — opens its own qlc-panel port to send FREEZE_TOGGLE and observe
 * FREEZE_STATE broadcasts from the content script via the service worker.
 *
 * The SW fans out FREEZE_STATE to every panel surface (top tab + sidebar pane
 * + side panel), so all visible UIs stay in sync.
 */
export function useFreeze() {
  const [frozen, setFrozen] = useState(false);
  const portRef = useRef<chrome.runtime.Port | null>(null);

  useEffect(() => {
    function connect() {
      let port: chrome.runtime.Port;
      try {
        port = chrome.runtime.connect({ name: PORT_NAME });
      } catch {
        return;
      }
      portRef.current = port;
      port.onMessage.addListener((msg: WorkerToPanel) => {
        if (msg.type === 'FREEZE_STATE') {
          setFrozen(msg.frozen);
        }
      });
      port.onDisconnect.addListener(() => {
        portRef.current = null;
        window.setTimeout(connect, 250);
      });
    }
    connect();
    return () => {
      try { portRef.current?.disconnect(); } catch {}
    };
  }, []);

  const toggle = useCallback(() => {
    let tabId: number | undefined;
    try {
      tabId = chrome.devtools.inspectedWindow.tabId;
    } catch {}
    if (tabId === undefined) return;
    // Optimistic flip — content script will confirm via FREEZE_STATE
    setFrozen((prev) => !prev);
    try {
      portRef.current?.postMessage({ type: 'FREEZE_TOGGLE', tabId });
    } catch {}
  }, []);

  return { frozen, toggle };
}
