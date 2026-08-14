import { useMemo, useState } from 'react';
import type { FrameworkDef } from '../lib/locators/types';
import type { RecordedStep } from '../lib/recorder/types';
import { emitAll, buildTestFile, defaultFilename } from '../lib/recorder/recorder';

export interface RecorderPanelProps {
  open: boolean;
  recording: boolean;
  steps: RecordedStep[];
  framework: FrameworkDef;
  testIdAttribute: string;
  onStart: () => void;
  onStop: () => void;
  onClear: () => void;
  onClose: () => void;
}

const ACTION_ICON: Record<RecordedStep['action'], string> = {
  click: '⊙',
  dblclick: '⦿',
  fill: '✎',
  select: '☰',
  press: '⌨',
};

const ACTION_LABEL: Record<RecordedStep['action'], string> = {
  click: 'click',
  dblclick: 'dblclick',
  fill: 'fill',
  select: 'select',
  press: 'press',
};

export function RecorderPanel({
  open,
  recording,
  steps,
  framework,
  testIdAttribute,
  onStart,
  onStop,
  onClear,
  onClose,
}: RecorderPanelProps) {
  const [copied, setCopied] = useState(false);

  const emitted = useMemo(
    () => emitAll(steps, framework, testIdAttribute),
    [steps, framework, testIdAttribute],
  );

  const code = useMemo(
    () => buildTestFile(steps, framework, testIdAttribute),
    [steps, framework, testIdAttribute],
  );

  if (!open) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  function handleDownload() {
    const filename = defaultFilename(framework);
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="qlc-rec-backdrop" role="dialog" aria-label="Action Recorder">
      <RecorderStyles />
      <div className="qlc-rec-drawer">
        <div className="qlc-rec-head">
          <div className="qlc-rec-head-left">
            <span
              className={`qlc-rec-status-dot ${recording ? 'qlc-rec-status-on' : 'qlc-rec-status-off'}`}
              aria-hidden
            />
            <span className="qlc-rec-status-text">
              {recording ? 'Recording' : steps.length ? 'Stopped' : 'Idle'}
            </span>
            <span className="qlc-rec-count">{steps.length} step{steps.length === 1 ? '' : 's'}</span>
            <span className="qlc-rec-framework">{framework.shortLabel}</span>
          </div>
          <button type="button" className="qlc-icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="qlc-rec-body">
          <div className="qlc-rec-steps">
            {steps.length === 0 ? (
              <div className="qlc-rec-empty">
                {recording
                  ? 'Recording started — click or type on the inspected page.'
                  : 'No steps yet. Click Start, then interact with the page.'}
              </div>
            ) : (
              <ol className="qlc-rec-list">
                {emitted.map((e, i) => (
                  <li key={e.step.id} className="qlc-rec-row">
                    <span className="qlc-rec-row-idx">{i + 1}</span>
                    <span className="qlc-rec-row-action" title={ACTION_LABEL[e.step.action]}>
                      <span className="qlc-rec-row-icon" aria-hidden>{ACTION_ICON[e.step.action]}</span>
                      {ACTION_LABEL[e.step.action]}
                    </span>
                    <code className="qlc-rec-row-locator" title={e.locatorExpression}>
                      {e.locatorExpression}
                    </code>
                    {e.step.value !== undefined && e.step.value !== '' && (
                      <span className="qlc-rec-row-value" title={e.step.value}>
                        “{truncate(e.step.value, 40)}”
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>

          {steps.length > 0 && (
            <div className="qlc-rec-code-wrap">
              <div className="qlc-rec-code-head">
                <span>Generated test ({framework.label})</span>
              </div>
              <pre className="qlc-rec-code"><code>{code}</code></pre>
            </div>
          )}
        </div>

        <div className="qlc-rec-foot">
          {!recording ? (
            <button type="button" className="qlc-btn qlc-btn-primary" onClick={onStart}>
              ● Start
            </button>
          ) : (
            <button type="button" className="qlc-btn qlc-btn-active" onClick={onStop}>
              ■ Stop
            </button>
          )}
          <button type="button" className="qlc-btn" onClick={onClear} disabled={!steps.length}>
            Clear
          </button>
          <div className="qlc-rec-foot-spacer" />
          <button type="button" className="qlc-btn" onClick={handleCopy} disabled={!steps.length}>
            {copied ? 'Copied' : 'Copy code'}
          </button>
          <button type="button" className="qlc-btn" onClick={handleDownload} disabled={!steps.length}>
            Download
          </button>
        </div>
      </div>
    </div>
  );
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

/**
 * Inlined styles for the recorder drawer. Kept here so the panel works
 * without requiring index.css edits (file contract limits panel CSS edits).
 */
function RecorderStyles() {
  return (
    <style>{`
      .qlc-rec-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.35);
        z-index: 50;
        display: flex;
        align-items: stretch;
        justify-content: flex-end;
      }
      .qlc-rec-drawer {
        width: min(720px, 100%);
        height: 100%;
        background: var(--qlc-bg, #fff);
        border-left: 1px solid var(--qlc-border, #e4e4e7);
        display: flex;
        flex-direction: column;
        box-shadow: -8px 0 32px rgba(0, 0, 0, 0.18);
      }
      .qlc-rec-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 12px;
        border-bottom: 1px solid var(--qlc-border, #e4e4e7);
        background: var(--qlc-bg-alt, #f4f4f5);
      }
      .qlc-rec-head-left {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .qlc-rec-status-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
      }
      .qlc-rec-status-on {
        background: #dc2626;
        box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.18);
        animation: qlc-rec-blink 1.4s ease-in-out infinite;
      }
      .qlc-rec-status-off { background: var(--qlc-fg-muted, #71717a); }
      @keyframes qlc-rec-blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      .qlc-rec-status-text {
        font-size: 12px;
        font-weight: 600;
        color: var(--qlc-fg, #18181b);
      }
      .qlc-rec-count {
        font-size: 10px;
        font-family: var(--qlc-mono, monospace);
        padding: 2px 6px;
        border-radius: 3px;
        background: var(--qlc-bg-row, #f4f4f5);
        color: var(--qlc-fg-muted, #71717a);
      }
      .qlc-rec-framework {
        font-size: 10px;
        font-family: var(--qlc-mono, monospace);
        color: var(--qlc-fg-muted, #71717a);
      }
      .qlc-rec-body {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 0;
      }
      .qlc-rec-steps {
        padding: 8px 12px;
        flex: 0 0 auto;
      }
      .qlc-rec-empty {
        padding: 24px 12px;
        text-align: center;
        color: var(--qlc-fg-muted, #71717a);
        font-size: 12px;
      }
      .qlc-rec-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .qlc-rec-row {
        display: grid;
        grid-template-columns: 24px 80px 1fr auto;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        border-radius: 4px;
        background: var(--qlc-bg-row, #fafafa);
        font-size: 11px;
      }
      .qlc-rec-row:hover { background: var(--qlc-bg-alt, #f4f4f5); }
      .qlc-rec-row-idx {
        font-family: var(--qlc-mono, monospace);
        color: var(--qlc-fg-muted, #71717a);
        font-size: 10px;
        text-align: right;
      }
      .qlc-rec-row-action {
        display: flex;
        align-items: center;
        gap: 4px;
        font-weight: 600;
        color: var(--qlc-fg, #18181b);
        text-transform: lowercase;
      }
      .qlc-rec-row-icon {
        display: inline-flex;
        width: 16px;
        height: 16px;
        align-items: center;
        justify-content: center;
        color: var(--qlc-accent, #2563eb);
      }
      .qlc-rec-row-locator {
        font-family: var(--qlc-mono, monospace);
        font-size: 11px;
        color: var(--qlc-fg, #18181b);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .qlc-rec-row-value {
        font-family: var(--qlc-mono, monospace);
        font-size: 10px;
        color: var(--qlc-accent, #2563eb);
        background: var(--qlc-accent-soft, #dbeafe);
        padding: 1px 6px;
        border-radius: 3px;
        max-width: 180px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .qlc-rec-code-wrap {
        border-top: 1px solid var(--qlc-border, #e4e4e7);
        background: var(--qlc-bg-alt, #f4f4f5);
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }
      .qlc-rec-code-head {
        padding: 6px 12px;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--qlc-fg-muted, #71717a);
        font-weight: 600;
      }
      .qlc-rec-code {
        margin: 0;
        padding: 8px 12px;
        font-family: var(--qlc-mono, monospace);
        font-size: 11px;
        line-height: 1.5;
        color: var(--qlc-fg, #18181b);
        background: var(--qlc-bg, #fff);
        overflow: auto;
        white-space: pre;
        flex: 1;
        min-height: 0;
      }
      .qlc-rec-foot {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 10px 12px;
        border-top: 1px solid var(--qlc-border, #e4e4e7);
        background: var(--qlc-bg-alt, #f4f4f5);
      }
      .qlc-rec-foot-spacer { flex: 1; }
    `}</style>
  );
}
