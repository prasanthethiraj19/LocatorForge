import type { SerializedElement } from '../locators/types';

/**
 * A single user-action recorded against the inspected page.
 * `element` is the same SerializedElement structure used everywhere else
 * (cssPath, xpath, attrs, role, accessible name, etc.), so the panel can
 * reuse `generateCandidates` to produce a high-quality locator per step.
 */
export type RecordedAction = 'click' | 'dblclick' | 'fill' | 'select' | 'press';

export interface RecordedStep {
  id: string;
  action: RecordedAction;
  element: SerializedElement;
  /** For `fill` this is the typed text. For `select` this is the option label/value. For `press` this is the key. */
  value?: string;
  timestamp: number;
}

export type RecorderStatus = 'idle' | 'recording' | 'stopped';

export interface RecorderState {
  status: RecorderStatus;
  steps: RecordedStep[];
}

/* ─── Wire contracts (content ↔ service worker ↔ panel) ──────────────── */

/**
 * Content script → service worker.
 * Content reports each captured user action. The service worker forwards
 * to any panel listening on the recorder port.
 */
export interface RecorderEvent {
  type: 'REC_EVENT';
  step: Omit<RecordedStep, 'id'>;
}

/**
 * Service worker → content script.
 * Tells content to begin or stop intercepting user events.
 */
export interface RecorderControl {
  type: 'REC_START' | 'REC_STOP';
}

/**
 * Panel → service worker over the recorder port (`qlc-recorder`).
 * The SW resolves `tabId` from `chrome.devtools.inspectedWindow.tabId`,
 * which the panel passes through so the SW does not have to guess.
 */
export type PanelToWorkerRecorder =
  | { type: 'REC_START'; tabId: number }
  | { type: 'REC_STOP'; tabId: number };

/**
 * Service worker → panel over the recorder port.
 * The SW relays content events as `REC_EVENT`. It may also send
 * `REC_STARTED` once the content script confirms it is intercepting.
 */
export type WorkerToPanelRecorder =
  | { type: 'REC_EVENT'; step: Omit<RecordedStep, 'id'> }
  | { type: 'REC_STARTED' }
  | { type: 'REC_STOPPED' };

/** Long-lived port name used by `useRecorder` to talk to the service worker. */
export const RECORDER_PORT_NAME = 'qlc-recorder';
