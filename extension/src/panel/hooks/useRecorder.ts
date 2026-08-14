/**
 * useRecorder — DevTools-panel hook for the Action Recorder.
 *
 * Wiring contract for the service worker (main thread will implement):
 *   - This hook opens a long-lived chrome.runtime.Port with the name
 *     RECORDER_PORT_NAME = 'qlc-recorder' (defined in lib/recorder/types.ts).
 *     This is a SEPARATE port from PORT_NAME = 'qlc-panel' which the
 *     existing picker uses, so the two flows do not collide.
 *   - The SW receives PanelToWorkerRecorder messages on that port:
 *       { type: 'REC_START', tabId } / { type: 'REC_STOP', tabId }
 *     The SW then chrome.tabs.sendMessage(tabId, { type: 'REC_START' | 'REC_STOP' })
 *     to drive the recorder content script (src/content/recorder.ts).
 *   - The content script broadcasts RecorderEvent via chrome.runtime.sendMessage
 *     ({ type: 'REC_EVENT', step }); the SW relays it back over this port
 *     to the panel, where this hook appends it as a step.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  RECORDER_PORT_NAME,
  type RecordedStep,
  type WorkerToPanelRecorder,
} from '../lib/recorder/types';

const MAX_STEPS = 50;

function genId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export interface UseRecorder {
  recording: boolean;
  steps: RecordedStep[];
  start: () => void;
  stop: () => void;
  clear: () => void;
  /** True once we've hit the MAX_STEPS cap and started silently dropping events. */
  capped: boolean;
}

export function useRecorder(): UseRecorder {
  const [recording, setRecording] = useState(false);
  const [steps, setSteps] = useState<RecordedStep[]>([]);
  const [capped, setCapped] = useState(false);
  const portRef = useRef<chrome.runtime.Port | null>(null);

  useEffect(() => {
    function connect() {
      let port: chrome.runtime.Port;
      try {
        port = chrome.runtime.connect({ name: RECORDER_PORT_NAME });
      } catch {
        return;
      }
      portRef.current = port;
      port.onMessage.addListener((msg: WorkerToPanelRecorder) => {
        if (msg.type === 'REC_EVENT') {
          setSteps((prev) => {
            if (prev.length >= MAX_STEPS) {
              setCapped(true);
              return prev;
            }
            const next: RecordedStep = { id: genId(), ...msg.step };
            return [...prev, next];
          });
        } else if (msg.type === 'REC_STARTED') {
          setRecording(true);
        } else if (msg.type === 'REC_STOPPED') {
          setRecording(false);
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
    let tabId: number | undefined;
    try {
      tabId = chrome.devtools.inspectedWindow.tabId;
    } catch {}
    if (tabId === undefined) return;
    setCapped(false);
    setRecording(true);
    try {
      portRef.current?.postMessage({ type: 'REC_START', tabId });
    } catch {}
  }, []);

  const stop = useCallback(() => {
    let tabId: number | undefined;
    try {
      tabId = chrome.devtools.inspectedWindow.tabId;
    } catch {}
    setRecording(false);
    try {
      if (tabId !== undefined) portRef.current?.postMessage({ type: 'REC_STOP', tabId });
    } catch {}
  }, []);

  const clear = useCallback(() => {
    setSteps([]);
    setCapped(false);
  }, []);

  return { recording, steps, start, stop, clear, capped };
}
