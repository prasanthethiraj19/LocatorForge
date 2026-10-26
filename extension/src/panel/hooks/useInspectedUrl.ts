import { useCallback, useEffect, useState } from 'react';

/**
 * How often to re-read the inspected page's URL. `onNavigated` alone is not
 * enough: it fires while the navigation is still committing, so the `location.href`
 * read inside the handler can still observe the PREVIOUS document. The panel then
 * believes it never left that page — page-scoped state (the Page Object class
 * name, its `goto()` URL, the basket's page key) sticks to the old page forever.
 */
const POLL_MS = 1000;

/** Delay used to re-read after a navigate event, once the commit has landed. */
const SETTLE_MS = 400;

export interface InspectedUrl {
  url: string;
  /** Re-read now — call before anything that depends on the current page identity. */
  refresh: () => void;
}

export function useInspectedUrl(): InspectedUrl {
  const [url, setUrl] = useState<string>('');

  const read = useCallback(() => {
    try {
      chrome.devtools.inspectedWindow.eval('location.href', (out, exc) => {
        if (exc || typeof out !== 'string' || !out) return;
        setUrl((prev) => (prev === out ? prev : out));
      });
    } catch {}
  }, []);

  useEffect(() => {
    read();

    const interval = window.setInterval(read, POLL_MS);

    const handler = () => {
      read();
      window.setTimeout(read, SETTLE_MS);
    };
    try { chrome.devtools.network?.onNavigated?.addListener(handler); } catch {}

    const onVisible = () => { if (!document.hidden) read(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      window.clearInterval(interval);
      try { chrome.devtools.network?.onNavigated?.removeListener(handler); } catch {}
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [read]);

  return { url, refresh: read };
}
