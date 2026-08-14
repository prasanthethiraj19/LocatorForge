import type { HistoryEntry } from '../hooks/useLocatorHistory';

interface Props {
  open: boolean;
  onClose: () => void;
  entries: HistoryEntry[];
  onJump: (e: HistoryEntry) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

function relative(ms: number): string {
  const d = Date.now() - ms;
  if (d < 60_000) return `${Math.floor(d / 1000)}s ago`;
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`;
  return `${Math.floor(d / 86_400_000)}d ago`;
}

export function HistoryDrawer({ open, onClose, entries, onJump, onRemove, onClear }: Props) {
  if (!open) return null;
  return (
    <div className="qlc-sheet-backdrop" onClick={onClose}>
      <div className="qlc-sheet qlc-sheet-history" onClick={(e) => e.stopPropagation()}>
        <div className="qlc-sheet-head">
          <h3>History · {entries.length}</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="qlc-btn" onClick={onClear} disabled={!entries.length}>
              Clear all
            </button>
            <button type="button" className="qlc-btn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <div className="qlc-sheet-body">
          {entries.length === 0 ? (
            <p className="qlc-no-candidates">No history yet. Pick or inspect any element — it appears here.</p>
          ) : (
            <ul className="qlc-history-list">
              {entries.map((e) => (
                <li key={e.id} className="qlc-history-row">
                  <button type="button" className="qlc-history-jump" onClick={() => onJump(e)}>
                    <div className="qlc-history-line">
                      <span className="qlc-tag-pill">&lt;{e.tag}&gt;</span>
                      <span className="qlc-history-label">{e.label}</span>
                    </div>
                    <div className="qlc-history-meta">
                      <span>{relative(e.at)}</span>
                      <span className="qlc-history-url">{shortenUrl(e.url)}</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="qlc-icon-btn"
                    onClick={() => onRemove(e.id)}
                    aria-label="Remove from history"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function shortenUrl(u: string): string {
  if (!u) return '';
  try {
    const p = new URL(u);
    return p.host + p.pathname.slice(0, 30);
  } catch {
    return u.slice(0, 40);
  }
}
