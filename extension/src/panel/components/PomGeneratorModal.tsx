import { useEffect, useMemo, useState } from 'react';
import type { PomItem } from '../lib/pom/types';
import type { FrameworkId } from '../lib/locators/types';
import { FRAMEWORKS } from '../lib/locators/frameworks';
import { generatePom } from '../lib/pom/generate';

interface Props {
  open: boolean;
  onClose: () => void;
  items: PomItem[];
  onRemove: (id: string) => void;
  onRename: (id: string, name: string) => void;
  defaultFramework: FrameworkId;
  inspectedUrl: string;
}

export function PomGeneratorModal({
  open,
  onClose,
  items,
  onRemove,
  onRename,
  defaultFramework,
  inspectedUrl,
}: Props) {
  const [className, setClassName] = useState('LoginPage');
  const [framework, setFramework] = useState<FrameworkId>(defaultFramework);
  const [url, setUrl] = useState(inspectedUrl);
  const [packageName, setPackageName] = useState('com.example.pages');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) setUrl(inspectedUrl);
  }, [open, inspectedUrl]);

  const code = useMemo(() => {
    if (!items.length) return '';
    return generatePom(items, { className, framework, url, packageName });
  }, [items, className, framework, url, packageName]);

  if (!open) return null;

  const fw = FRAMEWORKS.find((f) => f.id === framework);
  const showJavaPkg = fw?.language === 'Java';

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1100);
    } catch {}
  }

  function downloadFile() {
    const ext = fileExtensionFor(framework);
    const filename = `${className}.${ext}`;
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
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
          <h3>Generate Page Object</h3>
          <button type="button" className="qlc-btn" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="qlc-modal-body">
          <div className="qlc-modal-form">
            <label className="qlc-field">
              <span>Class name</span>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value || 'PageObject')}
                spellCheck={false}
              />
            </label>
            <label className="qlc-field">
              <span>Framework</span>
              <select
                className="qlc-fwpicker-select"
                value={framework}
                onChange={(e) => setFramework(e.target.value as FrameworkId)}
              >
                {FRAMEWORKS.map((f) => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
            </label>
            <label className="qlc-field">
              <span>Page URL</span>
              <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} spellCheck={false} />
            </label>
            {showJavaPkg && (
              <label className="qlc-field">
                <span>Java package</span>
                <input type="text" value={packageName} onChange={(e) => setPackageName(e.target.value)} spellCheck={false} />
              </label>
            )}
          </div>

          <div className="qlc-modal-fields">
            <div className="qlc-modal-fields-head">
              <span>{items.length} field{items.length === 1 ? '' : 's'}</span>
            </div>
            <ul className="qlc-fields-list">
              {items.map((it) => (
                <li key={it.id} className="qlc-field-row">
                  <input
                    type="text"
                    className="qlc-field-name"
                    value={it.fieldName}
                    onChange={(e) => onRename(it.id, e.target.value)}
                    spellCheck={false}
                  />
                  <span className={`qlc-kind qlc-kind-${it.candidate.kind.startsWith('smart-') ? 'smart' : it.candidate.kind}`}>
                    {it.candidate.kind}
                  </span>
                  <button type="button" className="qlc-icon-btn" onClick={() => onRemove(it.id)} title="Remove">
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="qlc-modal-output">
            <div className="qlc-modal-output-head">
              <span>Output</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button type="button" className="qlc-btn" onClick={downloadFile} disabled={!code}>
                  ⬇ Download
                </button>
                <button type="button" className="qlc-btn qlc-btn-primary" onClick={copy} disabled={!code}>
                  {copied ? '✓ Copied' : '⧉ Copy'}
                </button>
              </div>
            </div>
            <pre className="qlc-modal-code">{code || '// Add elements via the + button on locator rows.'}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function fileExtensionFor(frameworkId: FrameworkId): string {
  switch (frameworkId) {
    case 'playwright-ts': return 'ts';
    case 'playwright-js': return 'js';
    case 'playwright-py': return 'py';
    case 'playwright-java': return 'java';
    case 'selenium-java': return 'java';
    case 'selenium-py': return 'py';
    case 'cypress': return 'js';
    case 'webdriverio': return 'js';
    case 'robot': return 'robot';
  }
}
