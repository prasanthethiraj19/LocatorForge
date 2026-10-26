import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Candidate } from '../lib/locators/types';
import type { PomItem } from '../lib/pom/types';
import { pageKeyFromUrl, suggestFieldName } from '../lib/pom/naming';

const STORAGE_KEY = 'pomBasket';

function load(): PomItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((i) => ({ ...i, pageKey: typeof i.pageKey === 'string' ? i.pageKey : '' }));
      }
    }
  } catch {}
  return [];
}

function save(items: PomItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export function usePomBasket(currentUrl: string) {
  const [all, setAll] = useState<PomItem[]>([]);
  const pageKey = pageKeyFromUrl(currentUrl);
  const pageKeyRef = useRef(pageKey);
  pageKeyRef.current = pageKey;

  // Items captured before the inspected URL resolved get attached to the page
  // as soon as we know where we are, so nothing is silently stranded.
  function attachPageKey(items: PomItem[], key: string): PomItem[] {
    if (!key || !items.some((i) => !i.pageKey)) return items;
    const next = items.map((i) => (i.pageKey ? i : { ...i, pageKey: key }));
    save(next);
    return next;
  }

  useEffect(() => {
    setAll(attachPageKey(load(), pageKeyRef.current));
  }, []);

  useEffect(() => {
    setAll((prev) => attachPageKey(prev, pageKey));
  }, [pageKey]);

  const items = useMemo(() => all.filter((i) => i.pageKey === pageKey), [all, pageKey]);

  const add = useCallback(
    (c: Candidate) => {
      setAll((prev) => {
        const item: PomItem = {
          id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8),
          fieldName: suggestFieldName(c),
          candidate: c,
          addedAt: Date.now(),
          pageKey,
        };
        const next = [...prev, item];
        save(next);
        return next;
      });
    },
    [pageKey],
  );

  const remove = useCallback((id: string) => {
    setAll((prev) => {
      const next = prev.filter((i) => i.id !== id);
      save(next);
      return next;
    });
  }, []);

  const rename = useCallback((id: string, fieldName: string) => {
    setAll((prev) => {
      const next = prev.map((i) => (i.id === id ? { ...i, fieldName } : i));
      save(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setAll((prev) => {
      const next = prev.filter((i) => i.pageKey !== pageKey);
      save(next);
      return next;
    });
  }, [pageKey]);

  return { items, add, remove, rename, clear, pageKey };
}
