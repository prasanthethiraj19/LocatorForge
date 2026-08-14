import { useEffect, useRef, useState } from 'react';

interface Props {
  onCopyOnly: () => void;
  onCopyVariable: () => void;
  onCopyStatement: () => void;
}

export function CopyMenu({ onCopyOnly, onCopyVariable, onCopyStatement }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function flash(label: string) {
    setCopied(label);
    setOpen(false);
    window.setTimeout(() => setCopied(null), 1100);
  }

  return (
    <div className="qlc-copy-menu" ref={ref}>
      <button
        type="button"
        className="qlc-icon-btn qlc-icon-btn-primary"
        onClick={() => {
          onCopyOnly();
          flash('Copied');
        }}
        title="Copy locator"
      >
        {copied === 'Copied' ? '✓' : '⧉'}
      </button>
      <button
        type="button"
        className="qlc-icon-btn qlc-icon-btn-toggle"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title="More copy options"
      >
        ▾
      </button>
      {open && (
        <div className="qlc-menu" role="menu">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onCopyOnly();
              flash('Copied');
            }}
          >
            <span className="qlc-menu-ico">⧉</span>
            <span>Copy locator only</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onCopyVariable();
              flash('Copied');
            }}
          >
            <span className="qlc-menu-ico">≡</span>
            <span>Copy with variable</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onCopyStatement();
              flash('Copied');
            }}
          >
            <span className="qlc-menu-ico">⚡</span>
            <span>Copy full statement</span>
          </button>
        </div>
      )}
      {copied && <span className="qlc-copied-toast">{copied}</span>}
    </div>
  );
}
