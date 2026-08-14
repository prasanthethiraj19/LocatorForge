import { FrameworkPicker } from './FrameworkPicker';
import type { FrameworkId } from '../lib/locators/types';

interface Props {
  framework: FrameworkId;
  onFrameworkChange: (id: FrameworkId) => void;
  onClear: () => void;
  onCopyAll: () => void;
  onOpenSettings: () => void;
  onPickToggle: () => void;
  onToggleSmart: () => void;
  onToggleAxes: () => void;
  onToggleHealing: () => void;
  onOpenHistory: () => void;
  onToggleFreeze: () => void;
  onToggleRecord: () => void;
  onOpenTestData: () => void;
  onOpenExport: () => void;
  picking: boolean;
  showSmart: boolean;
  showAxes: boolean;
  withHealing: boolean;
  historyCount: number;
  hasElement: boolean;
  frozen: boolean;
  recording: boolean;
  recordingCount: number;
}

export function Toolbar({
  framework,
  onFrameworkChange,
  onClear,
  onCopyAll,
  onOpenSettings,
  onPickToggle,
  onToggleSmart,
  onToggleAxes,
  onToggleHealing,
  onOpenHistory,
  onToggleFreeze,
  onToggleRecord,
  onOpenTestData,
  onOpenExport,
  picking,
  showSmart,
  showAxes,
  withHealing,
  historyCount,
  hasElement,
  frozen,
  recording,
  recordingCount,
}: Props) {
  return (
    <div className="qlc-toolbar">
      <a
        className="qlc-brand"
        href="https://locatorforge.com"
        target="_blank"
        rel="noreferrer"
        title="locatorforge.com · no ads, no tracking, no BS"
      >
        <span className="qlc-brand-mark" aria-hidden>LF</span>
        <div className="qlc-brand-text">
          <span className="qlc-brand-name">Locator<span className="qlc-brand-dot">Forge</span></span>
          <span className="qlc-brand-tag">fast · no ads · no tracking</span>
        </div>
      </a>

      <FrameworkPicker value={framework} onChange={onFrameworkChange} />

      <div className="qlc-toolbar-actions">
        <button
          type="button"
          className={`qlc-btn ${picking ? 'qlc-btn-active' : ''}`}
          onClick={onPickToggle}
          aria-pressed={picking}
          title="Pick element on page (Esc to cancel)"
        >
          {picking ? '◉ Picking…' : '◎ Pick'}
        </button>
        <button
          type="button"
          className={`qlc-btn ${recording ? 'qlc-btn-active qlc-btn-rec' : ''}`}
          onClick={onToggleRecord}
          aria-pressed={recording}
          title="Record clicks and inputs → emit test code (Cmd/Ctrl+Shift+R)"
        >
          {recording ? `● Rec ${recordingCount}` : '● Record'}
        </button>
        <button
          type="button"
          className={`qlc-btn ${frozen ? 'qlc-btn-active' : ''}`}
          onClick={onToggleFreeze}
          aria-pressed={frozen}
          title="Freeze page DOM — keep hover menus open (Cmd/Ctrl+Shift+F)"
        >
          {frozen ? '❄ Frozen' : '❄ Freeze'}
        </button>
        <button
          type="button"
          className={`qlc-btn ${withHealing ? 'qlc-btn-toggle-on' : ''}`}
          onClick={onToggleHealing}
          aria-pressed={withHealing}
          title="Emit self-healing fallback chains via .or()"
        >
          ⛓ Heal
        </button>
        <button
          type="button"
          className={`qlc-btn ${showSmart ? 'qlc-btn-toggle-on' : ''}`}
          onClick={onToggleSmart}
          aria-pressed={showSmart}
          title="Show parameterized smart patterns"
        >
          ✨ Smart
        </button>
        <button
          type="button"
          className={`qlc-btn ${showAxes ? 'qlc-btn-toggle-on' : ''}`}
          onClick={onToggleAxes}
          aria-pressed={showAxes}
          title="Show xpath axes (ancestor / following / sibling)"
        >
          ⟿ Axes
        </button>
        <button
          type="button"
          className="qlc-btn"
          onClick={onOpenTestData}
          title="Generate realistic + edge + invalid test data for the selected field"
        >
          ▤ Test data
        </button>
        <button
          type="button"
          className="qlc-btn"
          onClick={onOpenExport}
          title="Export every key locator on this page as a markdown doc"
        >
          ⤓ Export page
        </button>
        <button
          type="button"
          className="qlc-btn"
          onClick={onOpenHistory}
          title="Recently picked elements"
        >
          ⌛ History {historyCount > 0 && <span className="qlc-btn-count">{historyCount}</span>}
        </button>
        <button type="button" className="qlc-btn" onClick={onClear} disabled={!hasElement}>
          Clear
        </button>
        <button type="button" className="qlc-btn qlc-btn-primary" onClick={onCopyAll} disabled={!hasElement}>
          Copy all
        </button>
        <button type="button" className="qlc-btn qlc-btn-icon" onClick={onOpenSettings} aria-label="Settings">
          ⚙
        </button>
      </div>
    </div>
  );
}
