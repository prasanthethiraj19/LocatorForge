import type { PomItem } from '../lib/pom/types';

interface Props {
  items: PomItem[];
  onOpen: () => void;
  onClear: () => void;
}

export function PomBasketBar({ items, onOpen, onClear }: Props) {
  if (!items.length) return null;
  return (
    <div className="qlc-basket-bar">
      <span className="qlc-basket-icon" aria-hidden>📋</span>
      <span className="qlc-basket-text">
        <strong>{items.length}</strong> element{items.length === 1 ? '' : 's'} ready for Page Object
      </span>
      <span className="qlc-basket-list">
        {items.slice(-4).map((it) => (
          <code key={it.id} className="qlc-basket-chip" title={it.candidate.kind}>{it.fieldName}</code>
        ))}
        {items.length > 4 && <span className="qlc-basket-more">+{items.length - 4}</span>}
      </span>
      <div className="qlc-basket-actions">
        <button type="button" className="qlc-btn qlc-btn-primary" onClick={onOpen}>
          Generate POM
        </button>
        <button type="button" className="qlc-btn" onClick={onClear} title="Clear basket">
          ×
        </button>
      </div>
    </div>
  );
}
