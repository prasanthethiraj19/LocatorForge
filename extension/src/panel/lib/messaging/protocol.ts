export type PanelToWorker =
  | { type: 'PICK_START'; tabId: number }
  | { type: 'PICK_CANCEL'; tabId: number }
  | { type: 'FREEZE_TOGGLE'; tabId: number };

export type WorkerToPanel =
  | { type: 'PICK_RESULT'; element: unknown }
  | { type: 'PICK_CANCELLED' }
  | { type: 'FREEZE_STATE'; frozen: boolean }
  | { type: 'CONTEXT_PICK'; cssPath: string };

export type WorkerToContent =
  | { type: 'PICK_START' }
  | { type: 'PICK_CANCEL' }
  | { type: 'FREEZE_ENTER' }
  | { type: 'FREEZE_EXIT' }
  | { type: 'FREEZE_TOGGLE' };

export type ContentToWorker =
  | { type: 'PICK_RESULT'; element: unknown }
  | { type: 'FREEZE_STATE'; frozen: boolean };

export const PORT_NAME = 'qlc-panel';
