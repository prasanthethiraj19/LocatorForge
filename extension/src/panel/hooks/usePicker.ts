import { useCallback, useEffect, useRef, useState } from 'react';
import { PORT_NAME, type WorkerToPanel } from '../lib/messaging/protocol';
import { SERIALIZE_FN_SOURCE } from '../lib/locators/serialize';
import type { SerializedElement } from '../lib/locators/types';

export interface UsePickerOpts {
  onPicked?: (element: SerializedElement | null) => void;
}

export function usePicker(opts: UsePickerOpts = {}) {
  const { onPicked } = opts;
  const [picking, setPicking] = useState(false);
  const portRef = useRef<chrome.runtime.Port | null>(null);
  const onPickedRef = useRef(onPicked);
  onPickedRef.current = onPicked;

  useEffect(() => {
    function connect() {
      const port = chrome.runtime.connect({ name: PORT_NAME });
      portRef.current = port;
      port.onMessage.addListener((msg: WorkerToPanel) => {
        if (msg.type === 'PICK_RESULT') {
          setPicking(false);
          const el = msg.element as (SerializedElement & { cssPath?: string }) | null;
          // The content script now serializes the picked element in its own
          // frame (works for iframes, nested frames and shadow roots), so use
          // the payload directly when present.
          if (el && typeof el.tag === 'string' && el.attrs) {
            onPickedRef.current?.(el as SerializedElement);
            return;
          }
          // Fallback (older content script): re-resolve a `host >> inner` path.
          if (el?.cssPath) {
            const code = `${SERIALIZE_FN_SOURCE}
(function(){
  var parts = ${JSON.stringify(el.cssPath)}.split('>>').map(function(s){ return s.trim(); }).filter(Boolean);
  var root = document;
  var node = null;
  for (var i = 0; i < parts.length; i++) {
    var found = root.querySelectorAll(parts[i]);
    if (!found.length) return null;
    node = found[0];
    if (i < parts.length - 1) root = node.shadowRoot || node;
  }
  return __qlcSerialize(node);
})()`;
            try {
              chrome.devtools.inspectedWindow.eval(code, (result, exc) => {
                if (exc || !result) {
                  onPickedRef.current?.(null);
                  return;
                }
                onPickedRef.current?.(result as SerializedElement);
              });
            } catch {
              onPickedRef.current?.(null);
            }
          } else {
            onPickedRef.current?.(null);
          }
        } else if (msg.type === 'PICK_CANCELLED') {
          setPicking(false);
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

  const start = useCallback(() => {
    const tabId = chrome.devtools.inspectedWindow.tabId;
    setPicking(true);
    portRef.current?.postMessage({ type: 'PICK_START', tabId });
  }, []);

  const cancel = useCallback(() => {
    const tabId = chrome.devtools.inspectedWindow.tabId;
    portRef.current?.postMessage({ type: 'PICK_CANCEL', tabId });
    setPicking(false);
  }, []);

  return { picking, start, cancel };
}
