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
          const el = msg.element as { cssPath?: string } | null;
          // Read picked element data directly via querySelector — no inspect() so DevTools stays on LocatorForge.
          if (el?.cssPath) {
            const code = `${SERIALIZE_FN_SOURCE}\n__qlcSerialize(document.querySelector(${JSON.stringify(el.cssPath)}))`;
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
