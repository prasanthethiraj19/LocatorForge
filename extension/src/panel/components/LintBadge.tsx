import { useState } from 'react';
import type { LintFinding } from '../lib/locators/types';

interface Props {
  findings: LintFinding[];
}

export function LintBadge({ findings }: Props) {
  const [open, setOpen] = useState(false);
  if (!findings.length) return null;

  const warnCount = findings.filter((f) => f.severity === 'warn').length;
  const cls = warnCount > 0 ? 'qlc-lint qlc-lint-warn' : 'qlc-lint qlc-lint-info';
  const icon = warnCount > 0 ? '!' : 'i';

  return (
    <span
      className={cls}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      tabIndex={0}
      title="Locator advice"
    >
      <span className="qlc-lint-icon">{icon}</span>
      {findings.length > 1 && <span className="qlc-lint-count">{findings.length}</span>}
      {open && (
        <span className="qlc-lint-pop">
          {findings.map((f, i) => (
            <span key={i} className={`qlc-lint-row qlc-lint-row-${f.severity}`}>
              <strong>{f.rule}</strong>
              <span>{f.message}</span>
            </span>
          ))}
        </span>
      )}
    </span>
  );
}
