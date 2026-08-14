import { useEffect, useState } from 'react';
import type { Candidate, GenerateOptions } from '../lib/locators/types';
import { buildCountSnippet } from '../lib/locators/generate';

export function useLiveCounts(
  candidates: Candidate[],
  opts: GenerateOptions,
  signature: string,
): Candidate[] {
  const [decorated, setDecorated] = useState<Candidate[]>(candidates);

  useEffect(() => {
    let cancelled = false;
    setDecorated(candidates);
    if (!candidates.length) return;

    const promises = candidates.map(
      (c) =>
        new Promise<number>((resolve) => {
          const code = buildCountSnippet(c, opts);
          try {
            chrome.devtools.inspectedWindow.eval(code, (result, exc) => {
              if (exc) resolve(0);
              else resolve(typeof result === 'number' ? result : 0);
            });
          } catch {
            resolve(0);
          }
        }),
    );

    Promise.all(promises).then((counts) => {
      if (cancelled) return;
      const next = candidates.map((c, i) => ({
        ...c,
        matchCount: counts[i],
        isUnique: counts[i] === 1,
      }));
      next.sort((a, b) => Number(b.isUnique) - Number(a.isUnique) || a.rank - b.rank);
      setDecorated(next);
    });

    return () => {
      cancelled = true;
    };
  }, [signature, opts.testIdAttribute]);

  return decorated;
}
