import { useCallback, useState } from 'react';

export interface TestResult {
  ok: boolean;
  count: number;
  error?: string;
}

export function useTestLocator() {
  const [result, setResult] = useState<TestResult | null>(null);
  const [running, setRunning] = useState(false);

  const run = useCallback((expression: string) => {
    if (!expression.trim()) {
      setResult(null);
      return;
    }
    setRunning(true);
    const code = buildEvalSnippet(expression);
    try {
      chrome.devtools.inspectedWindow.eval(code, (out, exc) => {
        setRunning(false);
        if (exc) {
          const msg = (exc as { description?: string; value?: string }).description || (exc as { value?: string }).value || 'eval error';
          setResult({ ok: false, count: 0, error: msg });
          return;
        }
        const n = typeof out === 'number' ? out : 0;
        setResult({ ok: n > 0, count: n });
      });
    } catch (e) {
      setRunning(false);
      setResult({ ok: false, count: 0, error: String(e) });
    }
  }, []);

  const clear = useCallback(() => setResult(null), []);

  return { result, running, run, clear };
}

function buildEvalSnippet(expr: string): string {
  const trimmed = expr.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('(/') || trimmed.startsWith('/')) {
    return `(function(){try{var r=document.evaluate(${JSON.stringify(trimmed)},document,null,XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,null);return r.snapshotLength}catch(e){return 0}})()`;
  }
  return `(function(){try{return document.querySelectorAll(${JSON.stringify(trimmed)}).length}catch(e){return 0}})()`;
}
