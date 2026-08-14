import { useCallback, useEffect, useRef, useState } from 'react';
import { SERIALIZE_FN_SOURCE } from '../lib/locators/serialize';
import type { SerializedElement } from '../lib/locators/types';

const IDLE_POLL_MS = 1000;
const ACTIVE_POLL_MS = 400;

export function useSelectedElement() {
  const [element, setElement] = useState<SerializedElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastJsonRef = useRef<string>('');
  const baselineJsonRef = useRef<string | null>(null); // $0 sig captured at pick-time
  const overrideActiveRef = useRef<boolean>(false);
  const stoppedRef = useRef(false);

  // External push: pick mode delivers serialized element directly (no inspect() so panel stays focused).
  // Override sticks until $0 changes (user clicks new DOM tree node) — then live polling wins again.
  const pushPicked = useCallback((picked: SerializedElement | null) => {
    overrideActiveRef.current = picked !== null;
    baselineJsonRef.current = lastJsonRef.current;
    if (picked) setElement(picked);
  }, []);

  useEffect(() => {
    stoppedRef.current = false;
    let timer: number | null = null;

    function readNow() {
      if (stoppedRef.current) return;
      const code = `${SERIALIZE_FN_SOURCE}\n__qlcSerialize($0)`;
      try {
        chrome.devtools.inspectedWindow.eval(code, (result, exc) => {
          if (stoppedRef.current) return;
          if (exc) {
            setError((exc as { description?: string; value?: string }).description || (exc as { value?: string }).value || 'eval error');
            return;
          }
          setError(null);
          const json = result == null ? '' : JSON.stringify(result);
          if (json === lastJsonRef.current) return;
          lastJsonRef.current = json;
          // Override holds while $0 unchanged from when pick happened.
          if (overrideActiveRef.current) {
            if (baselineJsonRef.current !== null && json !== baselineJsonRef.current) {
              overrideActiveRef.current = false;
              baselineJsonRef.current = null;
              setElement((result as SerializedElement) || null);
            }
            return;
          }
          setElement((result as SerializedElement) || null);
        });
      } catch (e) {
        setError(String(e));
      }
    }

    function pollLoop() {
      readNow();
      timer = window.setTimeout(pollLoop, element ? IDLE_POLL_MS : ACTIVE_POLL_MS);
    }

    pollLoop();

    // Fast-path: re-read instantly when user selects new element in Elements panel
    let onSelChanged: (() => void) | null = null;
    try {
      onSelChanged = () => readNow();
      chrome.devtools.panels.elements.onSelectionChanged.addListener(onSelChanged);
    } catch {}

    return () => {
      stoppedRef.current = true;
      if (timer) window.clearTimeout(timer);
      if (onSelChanged) {
        try { chrome.devtools.panels.elements.onSelectionChanged.removeListener(onSelChanged); } catch {}
      }
    };
  }, []);

  return { element, error, pushPicked };
}
