interface Props {
  open: boolean;
  onClose: () => void;
  testIdAttribute: string;
  onTestIdAttributeChange: (s: string) => void;
  showSmart: boolean;
  onShowSmartChange: (b: boolean) => void;
  showAxes: boolean;
  onShowAxesChange: (b: boolean) => void;
  withHealing: boolean;
  onWithHealingChange: (b: boolean) => void;
}

export function SettingsSheet({
  open,
  onClose,
  testIdAttribute,
  onTestIdAttributeChange,
  showSmart,
  onShowSmartChange,
  showAxes,
  onShowAxesChange,
  withHealing,
  onWithHealingChange,
}: Props) {
  if (!open) return null;
  return (
    <div className="qlc-sheet-backdrop" onClick={onClose}>
      <div className="qlc-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="qlc-sheet-head">
          <h3>Settings</h3>
          <button type="button" className="qlc-btn" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="qlc-sheet-body">
          <label className="qlc-field">
            <span>Test ID attribute</span>
            <input
              type="text"
              value={testIdAttribute}
              onChange={(e) => onTestIdAttributeChange(e.target.value || 'data-testid')}
              spellCheck={false}
            />
            <small>
              Default <code>data-testid</code>. Override if your project uses{' '}
              <code>data-qa-id</code>, <code>data-cy</code>, or similar.
            </small>
          </label>

          <Toggle
            id="qlc-toggle-smart"
            label="Show Smart Patterns"
            hint="Parameterized templates for inputs (placeholder, name, id, label)"
            value={showSmart}
            onChange={onShowSmartChange}
          />
          <Toggle
            id="qlc-toggle-axes"
            label="Show XPath Axes"
            hint="Relative xpath via ancestor / following / preceding / sibling axes"
            value={showAxes}
            onChange={onShowAxesChange}
          />
          <Toggle
            id="qlc-toggle-healing"
            label="Self-healing chains"
            hint="Emit primary locator + .or() fallbacks for robustness (Playwright only)"
            value={withHealing}
            onChange={onWithHealingChange}
          />

          <div className="qlc-about">
            <strong>LocatorForge</strong> · fast Chrome DevTools extension.
            <br />
            <strong>No ads. No tracking. No BS.</strong> All settings stay in your browser via
            <code>chrome.storage.sync</code>.
            <br />
            <a href="https://locatorforge.com" target="_blank" rel="noreferrer">locatorforge.com</a>
            <br />
            Locator priority: role → id → testid → name → text → label → placeholder → altText →
            title → chained → css → xpath → axes → absolute → position.
            <br />
            Frameworks: Playwright (TS/JS/Py/Java), Selenium (Java/Py), Cypress, WebdriverIO,
            Robot Framework.
            <br />
            Shadow DOM + iframe detection auto-emit chained / frameLocator wrappers.
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  id, label, hint, value, onChange,
}: { id: string; label: string; hint: string; value: boolean; onChange: (b: boolean) => void }) {
  return (
    <div className="qlc-toggle-row">
      <div>
        <label htmlFor={id}>{label}</label>
        <small>{hint}</small>
      </div>
      <input
        id={id}
        className="qlc-switch"
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
    </div>
  );
}
