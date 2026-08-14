import { useCallback, useEffect, useRef, useState } from 'react';
import type { SerializedElement } from '../lib/locators/types';

const STORAGE_KEY = 'qlc-history-v1';
const MAX = 50;

export interface HistoryEntry {
  id: string;
  at: number;
  tag: string;
  label: string;
  cssPath: string;
  xpath: string;
  url: string;
}

function load(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function save(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX)));
  } catch {}
}

function summarize(el: SerializedElement): string {
  if (el.attrs.id) return `#${el.attrs.id}`;
  if (el.labelText) return `<label> ${el.labelText.slice(0, 30)}`;
  if (el.placeholder) return `[placeholder] ${el.placeholder.slice(0, 30)}`;
  if (el.visibleText) return `"${el.visibleText.slice(0, 30)}"`;
  if (el.role) return `role=${el.role}`;
  return el.tag;
}

export function useLocatorHistory(element: SerializedElement | null, currentUrl: string) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const lastSignatureRef = useRef<string>('');

  useEffect(() => {
    setEntries(load());
  }, []);

  useEffect(() => {
    if (!element) return;
    const signature = `${element.cssPath}|${element.xpath}`;
    if (signature === lastSignatureRef.current) return;
    lastSignatureRef.current = signature;
    setEntries((prev) => {
      const entry: HistoryEntry = {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        at: Date.now(),
        tag: element.tag,
        label: summarize(element),
        cssPath: element.cssPath,
        xpath: element.xpath,
        url: currentUrl,
      };
      const deduped = prev.filter((e) => `${e.cssPath}|${e.xpath}` !== signature);
      const next = [entry, ...deduped].slice(0, MAX);
      save(next);
      return next;
    });
  }, [element, currentUrl]);

  const remove = useCallback((id: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      save(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setEntries([]);
    save([]);
  }, []);

  const jumpTo = useCallback((entry: HistoryEntry) => {
    const code = `inspect(document.evaluate(${JSON.stringify(entry.xpath)},document,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null).singleNodeValue)`;
    try { chrome.devtools.inspectedWindow.eval(code); } catch {}
  }, []);

  return { entries, remove, clear, jumpTo };
}
