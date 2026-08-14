import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TestResult } from '../hooks/useTestLocator';

interface Props {
  result: TestResult | null;
  running: boolean;
  onRun: (expr: string) => void;
  onClear: () => void;
}

/**
 * Common HTML / ARIA / test-id attribute names — used as a baseline for
 * autosuggest, merged with names actually discovered on the inspected page.
 */
const STATIC_ATTRS = [
  'id', 'class', 'name', 'type', 'href', 'src', 'alt', 'title', 'placeholder', 'value', 'role',
  'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-hidden', 'aria-expanded',
  'aria-checked', 'aria-selected', 'aria-disabled', 'data-testid', 'data-qa', 'data-cy',
  'data-test', 'data-id', 'disabled', 'readonly', 'required', 'checked', 'selected',
  'tabindex', 'contenteditable', 'draggable', 'for', 'autocomplete', 'autofocus',
  'multiple', 'min', 'max', 'step', 'pattern', 'minlength', 'maxlength',
];

const PAGE_ATTR_TTL_MS = 5000;

const PAGE_ATTR_SNIPPET =
  "(function(){var s=new Set();var els=document.querySelectorAll('*');var lim=Math.min(els.length,200);for(var i=0;i<lim;i++){var a=els[i].attributes;for(var j=0;j<a.length;j++)s.add(a[j].name)}return Array.from(s)})()";

let attrCache: { values: string[]; at: number } | null = null;

function fetchPageAttrs(): Promise<string[]> {
  return new Promise((resolve) => {
    const now = Date.now();
    if (attrCache && now - attrCache.at < PAGE_ATTR_TTL_MS) {
      resolve(attrCache.values);
      return;
    }
    try {
      chrome.devtools.inspectedWindow.eval(PAGE_ATTR_SNIPPET, (out, exc) => {
        if (exc || !Array.isArray(out)) {
          resolve(attrCache?.values || []);
          return;
        }
        const values = (out as unknown[]).filter((v): v is string => typeof v === 'string');
        attrCache = { values, at: Date.now() };
        resolve(values);
      });
    } catch {
      resolve(attrCache?.values || []);
    }
  });
}

/**
 * Walk left from `caret` in `text`. If we find an unmatched `[`, return the
 * partial attribute name typed so far. Otherwise null.
 */
function detectAttrContext(text: string, caret: number): { partial: string; bracketIndex: number } | null {
  for (let i = caret - 1; i >= 0; i--) {
    const ch = text[i];
    if (ch === ']') return null;
    if (ch === '[') {
      const between = text.slice(i + 1, caret);
      // Inside attr-name mode only if there's no `=` between bracket and caret
      if (between.includes('=')) return null;
      // Trim leading whitespace; ignore if it includes spaces (we're past the name)
      const partial = between.replace(/^\s+/, '');
      if (/\s/.test(partial)) return null;
      return { partial, bracketIndex: i };
    }
  }
  return null;
}

export function TestLocator({ result, running, onRun, onClear }: Props) {
  const [value, setValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [pageAttrs, setPageAttrs] = useState<string[]>([]);
  const [attrCtx, setAttrCtx] = useState<{ partial: string; bracketIndex: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastFetchAt = useRef(0);

  const allAttrs = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const a of [...STATIC_ATTRS, ...pageAttrs]) {
      const lower = a.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        out.push(a);
      }
    }
    return out;
  }, [pageAttrs]);

  const refreshPageAttrs = useCallback(() => {
    const now = Date.now();
    if (now - lastFetchAt.current < PAGE_ATTR_TTL_MS) return;
    lastFetchAt.current = now;
    fetchPageAttrs().then((vals) => setPageAttrs(vals));
  }, []);

  function handleRun() {
    setShowSuggestions(false);
    onRun(value);
  }

  function handleClear() {
    setValue('');
    setShowSuggestions(false);
    setAttrCtx(null);
    onClear();
  }

  function computeContextFromInput() {
    const input = inputRef.current;
    if (!input) return;
    const caret = input.selectionStart ?? value.length;
    const ctx = detectAttrContext(value, caret);
    if (!ctx) {
      setShowSuggestions(false);
      setAttrCtx(null);
      return;
    }
    refreshPageAttrs();
    const partialLower = ctx.partial.toLowerCase();
    const filtered = allAttrs
      .filter((a) => a.toLowerCase().startsWith(partialLower))
      .slice(0, 12);
    setAttrCtx(ctx);
    setSuggestions(filtered);
    setSelectedSuggestion(0);
    setShowSuggestions(filtered.length > 0);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(e.target.value);
  }

  // Recompute the suggestion list whenever the value changes (after React commits state).
  useEffect(() => {
    computeContextFromInput();
    // We intentionally re-run when allAttrs (static + page list) changes too,
    // so the dropdown gets fresh page-discovered names.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, allAttrs]);

  function applySuggestion(suggestion: string) {
    const input = inputRef.current;
    if (!input || !attrCtx) return;
    const caret = input.selectionStart ?? value.length;
    const before = value.slice(0, attrCtx.bracketIndex + 1);
    const after = value.slice(caret);
    const next = before + suggestion + after;
    setValue(next);
    setShowSuggestions(false);
    // Position the caret right after the inserted attribute name.
    const newCaret = before.length + suggestion.length;
    window.requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(newCaret, newCaret);
    });
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (showSuggestions && suggestions.length) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestion((s) => (s + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestion((s) => (s - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applySuggestion(suggestions[selectedSuggestion]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false);
        return;
      }
    }
    if (e.key === 'Enter') handleRun();
    else if (e.key === 'Escape') handleClear();
  }

  function handleBlur() {
    // Delay so clicks on the dropdown register before it closes
    window.setTimeout(() => setShowSuggestions(false), 120);
  }

  function handleFocus() {
    computeContextFromInput();
  }

  return (
    <div className="qlc-testbar">
      <SuggestStyles />
      <span className="qlc-testbar-label">Test:</span>
      <div className="qlc-testbar-input-wrap" style={{ position: 'relative', flex: 1, minWidth: 0 }}>
        <input
          ref={inputRef}
          type="text"
          className="qlc-testbar-input"
          placeholder="CSS or XPath — Enter to run, Esc to clear"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKey}
          onClick={computeContextFromInput}
          onKeyUp={computeContextFromInput}
          onBlur={handleBlur}
          onFocus={handleFocus}
          spellCheck={false}
          style={{ width: '100%' }}
        />
        {showSuggestions && suggestions.length > 0 && (
          <ul className="qlc-attr-suggest" role="listbox">
            {suggestions.map((s, i) => (
              <li
                key={s}
                role="option"
                aria-selected={i === selectedSuggestion}
                className={
                  'qlc-attr-suggest-item ' +
                  (i === selectedSuggestion ? 'qlc-attr-suggest-item-active' : '')
                }
                onMouseDown={(e) => {
                  e.preventDefault();
                  applySuggestion(s);
                }}
                onMouseEnter={() => setSelectedSuggestion(i)}
              >
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>
      <button type="button" className="qlc-icon-btn qlc-icon-btn-primary" onClick={handleRun} disabled={running}>
        ▶
      </button>
      <button type="button" className="qlc-icon-btn" onClick={handleClear} title="Clear">
        ↺
      </button>
      {result && (
        <span
          className={
            'qlc-testbar-result ' +
            (result.error
              ? 'qlc-testbar-result-error'
              : result.count === 1
              ? 'qlc-testbar-result-unique'
              : result.count === 0
              ? 'qlc-testbar-result-zero'
              : 'qlc-testbar-result-many')
          }
        >
          {result.error ? `× ${result.error}` : result.count === 1 ? '✓ unique (1)' : `${result.count} matches`}
        </span>
      )}
    </div>
  );
}

/**
 * Inlined styles for the attribute autosuggest dropdown so it works without
 * requiring index.css edits (file contract: panel CSS file is not editable here).
 */
function SuggestStyles() {
  return (
    <style>{`
      .qlc-attr-suggest {
        position: absolute;
        top: calc(100% + 2px);
        left: 0;
        right: 0;
        z-index: 100;
        margin: 0;
        padding: 2px;
        list-style: none;
        background: var(--qlc-bg, #fff);
        border: 1px solid var(--qlc-border-strong, #d4d4d8);
        border-radius: 4px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
        max-height: 220px;
        overflow-y: auto;
        font-family: var(--qlc-mono, ui-monospace, SFMono-Regular, monospace);
        font-size: 11px;
      }
      .qlc-attr-suggest-item {
        padding: 4px 8px;
        cursor: pointer;
        border-radius: 3px;
        color: var(--qlc-fg, #18181b);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .qlc-attr-suggest-item-active {
        background: var(--qlc-accent-soft, #dbeafe);
        color: var(--qlc-accent, #2563eb);
      }
    `}</style>
  );
}
