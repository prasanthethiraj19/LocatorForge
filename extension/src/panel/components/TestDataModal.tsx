import { useEffect, useMemo, useState } from 'react';
import type { SerializedElement } from '../lib/locators/types';
import {
  generate,
  generateSelectFromOptions,
  TEST_DATA_LABELS,
  TEST_DATA_TYPES,
  type TestDataType,
} from '../lib/testdata/generators';
import { detectType } from '../lib/testdata/detect';
import './TestDataModal.css';

interface TestDataModalProps {
  open: boolean;
  onClose: () => void;
  element: SerializedElement | null;
  onFill?: (value: string) => void;
}

type Column = 'realistic' | 'edge' | 'invalid';

const COLUMN_LABELS: Record<Column, string> = {
  realistic: 'Realistic',
  edge: 'Edge case',
  invalid: 'Invalid',
};

const COLUMN_HINTS: Record<Column, string> = {
  realistic: 'Passes typical validation',
  edge: 'Legal but boundary / unicode / long',
  invalid: 'Should be rejected by validation',
};

const ROW_COUNT = 8;

export function TestDataModal({ open, onClose, element, onFill }: TestDataModalProps) {
  const detected = useMemo<TestDataType>(() => detectType(element), [element]);
  const [type, setType] = useState<TestDataType>(detected);
  const [selectOptions, setSelectOptions] = useState<string[] | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [fillStatus, setFillStatus] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  // When the modal opens (or the element changes), reset overrides back to the detected type.
  useEffect(() => {
    if (open) {
      setType(detected);
      setSelectOptions(null);
      setFillStatus(null);
    }
  }, [open, detected]);

  // For <select> elements: pull the current <option> values from the page so the
  // realistic column reflects what the user can actually choose.
  useEffect(() => {
    if (!open || !element) return;
    if (element.tag.toLowerCase() !== 'select') {
      setSelectOptions(null);
      return;
    }
    // We re-fetch by reading $0 in the inspected window. This must use the live
    // selection so it lines up with whatever the user picked.
    const code = `(() => {
      const el = $0;
      if (!el || el.tagName !== 'SELECT') return null;
      return Array.from(el.options).map(o => o.value != null ? o.value : o.textContent || '');
    })()`;
    try {
      chrome.devtools.inspectedWindow.eval<string[] | null>(code, (result, exc) => {
        if (exc) {
          setSelectOptions(null);
          return;
        }
        setSelectOptions(Array.isArray(result) ? result : null);
      });
    } catch {
      setSelectOptions(null);
    }
  }, [open, element]);

  const columns = useMemo(() => {
    if (type === 'select' && selectOptions && selectOptions.length) {
      return generateSelectFromOptions(selectOptions);
    }
    return generate(type);
  }, [type, selectOptions]);

  if (!open) return null;

  async function copy(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1100);
    } catch {
      // Clipboard may be blocked in some contexts; surface a visual cue anyway.
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1100);
    }
  }

  function fillIntoSelected(value: string) {
    if (onFill) {
      try {
        onFill(value);
        setFillStatus({ kind: 'ok', msg: 'Filled into $0' });
        window.setTimeout(() => setFillStatus(null), 1800);
      } catch (e) {
        setFillStatus({ kind: 'err', msg: 'Fill failed' });
      }
      return;
    }
    // Built-in fallback: dispatch input + change events via inspectedWindow.eval.
    if (!element) {
      setFillStatus({ kind: 'err', msg: 'No selected element' });
      window.setTimeout(() => setFillStatus(null), 1800);
      return;
    }
    const literal = JSON.stringify(value);
    const code = `(() => {
      const el = $0;
      if (!el) return { ok: false, reason: 'no-selection' };
      const tag = el.tagName ? el.tagName.toLowerCase() : '';
      if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') {
        // Try contenteditable surfaces as a last resort.
        if (el.isContentEditable) {
          el.focus();
          el.textContent = ${literal};
          el.dispatchEvent(new Event('input', { bubbles: true }));
          return { ok: true };
        }
        return { ok: false, reason: 'not-fillable' };
      }
      el.focus();
      try {
        const proto = tag === 'textarea'
          ? window.HTMLTextAreaElement.prototype
          : tag === 'select'
            ? window.HTMLSelectElement.prototype
            : window.HTMLInputElement.prototype;
        const desc = Object.getOwnPropertyDescriptor(proto, 'value');
        if (desc && desc.set) {
          desc.set.call(el, ${literal});
        } else {
          el.value = ${literal};
        }
      } catch (e) {
        el.value = ${literal};
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true };
    })()`;
    try {
      chrome.devtools.inspectedWindow.eval<{ ok: boolean; reason?: string }>(
        code,
        (result, exc) => {
          if (exc) {
            setFillStatus({ kind: 'err', msg: 'Fill failed: eval error' });
          } else if (result && result.ok) {
            setFillStatus({ kind: 'ok', msg: 'Filled into $0' });
          } else {
            const reason = result && result.reason ? result.reason : 'unknown';
            setFillStatus({ kind: 'err', msg: `Fill skipped (${reason})` });
          }
          window.setTimeout(() => setFillStatus(null), 1800);
        },
      );
    } catch {
      setFillStatus({ kind: 'err', msg: 'Fill failed' });
      window.setTimeout(() => setFillStatus(null), 1800);
    }
  }

  function fillTopRealistic() {
    const v = columns.realistic.find((s) => s !== '');
    if (v != null) fillIntoSelected(v);
  }

  const canFill =
    !!element &&
    (['input', 'textarea', 'select'].includes(element.tag.toLowerCase()) ||
      element.attrs.contenteditable === '' ||
      element.attrs.contenteditable === 'true');

  const targetDescription = element
    ? `<${element.tag}${element.attrs.type ? ` type="${element.attrs.type}"` : ''}${
        element.attrs.name ? ` name="${element.attrs.name}"` : ''
      }>`
    : 'No selection';

  return (
    <div className="qlc-modal-backdrop" onClick={onClose}>
      <div
        className="qlc-modal qlc-testdata-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Test data generator"
      >
        <div className="qlc-modal-head">
          <h3>Test Data Generator</h3>
          <div className="qlc-testdata-head-actions">
            <button
              type="button"
              className="qlc-btn qlc-btn-primary"
              onClick={fillTopRealistic}
              disabled={!canFill}
              title={
                canFill
                  ? 'Fill the currently selected field with the first realistic value'
                  : 'Select an input, textarea, or select element to enable filling'
              }
            >
              ⇲ Fill realistic
            </button>
            <button type="button" className="qlc-btn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="qlc-testdata-body">
          <div className="qlc-testdata-meta">
            <span className="qlc-testdata-meta-label">Target</span>
            <span className="qlc-testdata-meta-target">
              <code>{targetDescription}</code>
            </span>
            <span className="qlc-testdata-meta-label" style={{ marginLeft: 12 }}>
              Detected
            </span>
            <span className="qlc-testdata-type-pill">{TEST_DATA_LABELS[detected]}</span>
            <span className="qlc-testdata-meta-label" style={{ marginLeft: 12 }}>
              Override
            </span>
            <select
              className="qlc-testdata-type-select"
              value={type}
              onChange={(e) => setType(e.target.value as TestDataType)}
            >
              {TEST_DATA_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TEST_DATA_LABELS[t]}
                </option>
              ))}
            </select>
            {fillStatus && (
              <span
                className={`qlc-testdata-fill-status ${
                  fillStatus.kind === 'err' ? 'qlc-testdata-fill-status-err' : ''
                }`}
              >
                {fillStatus.msg}
              </span>
            )}
          </div>

          <div className="qlc-testdata-table-wrap">
            <table className="qlc-testdata-table">
              <thead>
                <tr>
                  {(['realistic', 'edge', 'invalid'] as Column[]).map((col) => (
                    <th
                      key={col}
                      className={`qlc-testdata-th-${col}`}
                      title={COLUMN_HINTS[col]}
                    >
                      {COLUMN_LABELS[col]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: ROW_COUNT }).map((_, rowIdx) => (
                  <tr key={rowIdx}>
                    {(['realistic', 'edge', 'invalid'] as Column[]).map((col) => {
                      const value = columns[col][rowIdx] ?? '';
                      const cellKey = `${col}:${rowIdx}`;
                      const isEmpty = value === '';
                      const display = isEmpty
                        ? '(empty)'
                        : value === ' '
                          ? '(single space)'
                          : value;
                      return (
                        <td key={col}>
                          <div
                            className={`qlc-testdata-cell ${
                              isEmpty ? 'qlc-testdata-cell-empty' : ''
                            }`}
                          >
                            <span className="qlc-testdata-value">{display}</span>
                            <span className="qlc-testdata-cell-actions">
                              <button
                                type="button"
                                className={`qlc-testdata-mini ${
                                  copiedKey === cellKey ? 'qlc-testdata-mini-copied' : ''
                                }`}
                                onClick={() => copy(value, cellKey)}
                                title="Copy to clipboard"
                                aria-label="Copy"
                              >
                                {copiedKey === cellKey ? '✓' : '⧉'}
                              </button>
                              <button
                                type="button"
                                className="qlc-testdata-mini qlc-testdata-mini-fill"
                                onClick={() => fillIntoSelected(value)}
                                disabled={!canFill}
                                title={
                                  canFill
                                    ? 'Fill into selected element ($0)'
                                    : 'Select a fillable element to enable'
                                }
                                aria-label="Fill"
                              >
                                ⇲
                              </button>
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="qlc-testdata-footer">
            <div className="qlc-testdata-legend">
              <span className="qlc-testdata-legend-item">
                <span className="qlc-testdata-legend-dot qlc-testdata-legend-dot-realistic" />
                Realistic — passes validation
              </span>
              <span className="qlc-testdata-legend-item">
                <span className="qlc-testdata-legend-dot qlc-testdata-legend-dot-edge" />
                Edge — boundary / unicode / long
              </span>
              <span className="qlc-testdata-legend-item">
                <span className="qlc-testdata-legend-dot qlc-testdata-legend-dot-invalid" />
                Invalid — should be rejected
              </span>
            </div>
            <span>All values are synthetic. No real PII.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
