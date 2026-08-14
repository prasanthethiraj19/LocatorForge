import { useEffect, useState } from 'react';

export function useInspectedUrl(): string {
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    function refresh() {
      try {
        chrome.devtools.inspectedWindow.eval('location.href', (out, exc) => {
          if (!exc && typeof out === 'string') setUrl(out);
        });
      } catch {}
    }
    refresh();
    const handler = () => refresh();
    chrome.devtools.network?.onNavigated?.addListener(handler);
    return () => {
      try { chrome.devtools.network?.onNavigated?.removeListener(handler); } catch {}
    };
  }, []);

  return url;
}
