import { useCallback, useEffect, useState } from 'react';
import type { Candidate } from '../lib/locators/types';
import type { PomItem } from '../lib/pom/types';
import { suggestFieldName } from '../lib/pom/naming';

const STORAGE_KEY = 'pomBasket';

function load(): PomItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function save(items: PomItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export function usePomBasket() {
  const [items, setItems] = useState<PomItem[]>([]);

  useEffect(() => {
    setItems(load());
  }, []);

  const add = useCallback((c: Candidate) => {
    setItems((prev) => {
      const item: PomItem = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8),
        fieldName: suggestFieldName(c),
        candidate: c,
        addedAt: Date.now(),
      };
      const next = [...prev, item];
      save(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      save(next);
      return next;
    });
  }, []);

  const rename = useCallback((id: string, fieldName: string) => {
    setItems((prev) => {
      const next = prev.map((i) => (i.id === id ? { ...i, fieldName } : i));
      save(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    save([]);
  }, []);

  return { items, add, remove, rename, clear };
}
