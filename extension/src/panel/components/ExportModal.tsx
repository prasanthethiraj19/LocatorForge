import { useEffect, useState } from 'react';
import type { FrameworkDef } from '../lib/locators/types';
import { harvestPageLocators } from '../lib/export/pageExport';

export interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  inspectedUrl: string;
  framework: FrameworkDef;
  testIdAttribute: string;
  showSmart: boolean;
}

export function ExportModal({
  open,
  onClose,
  inspectedUrl,
  framework,
  testIdAttribute,
  showSmart,
}: ExportModalProps) {
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setMarkdown('');
    harvestPageLocators({ inspectedUrl, framework, testIdAttribute, showSmart })
      .then((md) => {
        if (cancelled) return;
        setMarkdown(md);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, inspectedUrl, framework, testIdAttribute, showSmart]);

  if (!open) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1100);
    } catch {
      // ignore
    }
  }

  function downloadFile() {
    const host = safeHost(inspectedUrl);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `page-locators-${host}-${stamp}.md`;
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  return (
    <div className="qlc-modal-backdrop" onClick={onClose}>
      <div className="qlc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="qlc-modal-head">
          <h3>Export page locators</h3>
          <button type="button" className="qlc-btn" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="qlc-modal-body">
          <div className="qlc-modal-form">
            <div className="qlc-field">
              <span>URL</span>
              <input type="text" value={inspectedUrl} readOnly spellCheck={false} />
            </div>
            <div className="qlc-field">
              <span>Framework</span>
              <input type="text" value={framework.label} readOnly spellCheck={false} />
            </div>
          </div>

          <div className="qlc-modal-output" style={{ gridColumn: '1 / -1' }}>
            <div className="qlc-modal-output-head">
              <span>
                {loading
                  ? 'Harvesting…'
                  : error
                    ? 'Error'
                    : 'Markdown'}
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  type="button"
                  className="qlc-btn"
                  onClick={downloadFile}
                  disabled={!markdown || loading}
                >
                  ⬇ Download .md
                </button>
                <button
                  type="button"
                  className="qlc-btn qlc-btn-primary"
                  onClick={copy}
                  disabled={!markdown || loading}
                >
                  {copied ? '✓ Copied' : '⧉ Copy'}
                </button>
              </div>
            </div>
            <pre className="qlc-modal-code">
              {loading
                ? 'Walking the DOM…'
                : error
                  ? `// ${error}`
                  : markdown || '// No interactive elements found.'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/[^a-z0-9.-]/gi, '-') || 'page';
  } catch {
    return 'page';
  }
}
