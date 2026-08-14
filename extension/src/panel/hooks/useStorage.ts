import { useCallback, useEffect, useState } from 'react';

export function useStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!chrome?.storage?.sync) {
      setLoaded(true);
      return;
    }
    chrome.storage.sync.get([key], (res) => {
      if (res && key in res) setValue(res[key] as T);
      setLoaded(true);
    });
    const listener = (changes: { [k: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === 'sync' && key in changes) setValue(changes[key].newValue as T);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [key]);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      if (chrome?.storage?.sync) chrome.storage.sync.set({ [key]: next });
    },
    [key],
  );

  return [value, update, loaded] as const;
}
