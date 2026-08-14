interface Props {
  error?: string | null;
}

export function EmptyState({ error }: Props) {
  return (
    <div className="qlc-empty">
      <div className="qlc-empty-icon" aria-hidden>◎</div>
      <h2>No element selected</h2>
      <p>
        Pick an element on the page (button above), or open the <strong>Elements</strong> panel and
        click any element. Locators generate automatically.
      </p>
      <ul className="qlc-empty-tips">
        <li>
          <kbd>Cmd</kbd>/<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd> to start picking via DevTools
        </li>
        <li>Or right-click any element &rarr; <em>Inspect</em></li>
        <li>Type a CSS/XPath in the test bar above to verify any locator</li>
        <li>
          <strong>Auto-open:</strong> in <em>Elements</em> panel, click the <strong>LocatorForge</strong> sub-tab
          (next to Styles/Computed). Stays open and updates whenever you click a DOM node.
        </li>
      </ul>
      {error ? <p className="qlc-error">Error: {error}</p> : null}
    </div>
  );
}
