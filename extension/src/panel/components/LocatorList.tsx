import { useState } from 'react';
import type { Candidate, FrameworkDef, Section } from '../lib/locators/types';
import { LocatorRow } from './LocatorRow';
import { SECTION_TITLE, SECTION_HINT, SECTION_ORDER } from '../lib/locators/stability';

interface Props {
  candidates: Candidate[];
  framework: FrameworkDef;
  onHighlight: (c: Candidate) => void;
  onAddToPom: (c: Candidate) => void;
  showSmart: boolean;
  showAxes: boolean;
  withHealing: boolean;
}

const ALL_SECTIONS: Section[] = ['recommended', 'smart', 'alternative', 'axes', 'fallback'];

export function LocatorList({ candidates, framework, onHighlight, onAddToPom, showSmart, showAxes, withHealing }: Props) {
  if (!candidates.length) {
    return <p className="qlc-no-candidates">No locators could be derived for this element.</p>;
  }

  const grouped = new Map<Section, Candidate[]>();
  for (const c of candidates) {
    const list = grouped.get(c.section) || [];
    list.push(c);
    grouped.set(c.section, list);
  }

  return (
    <div className="qlc-sections">
      {ALL_SECTIONS.sort((a, b) => SECTION_ORDER[a] - SECTION_ORDER[b]).map((s) => {
        const items = grouped.get(s);
        if (!items || items.length === 0) return null;
        if (s === 'smart' && !showSmart) return null;
        if (s === 'axes' && !showAxes) return null;
        return (
          <SectionGroup
            key={s}
            section={s}
            items={items}
            framework={framework}
            onHighlight={onHighlight}
            onAddToPom={onAddToPom}
            withHealing={withHealing}
          />
        );
      })}
    </div>
  );
}

function SectionGroup({
  section,
  items,
  framework,
  onHighlight,
  onAddToPom,
  withHealing,
}: {
  section: Section;
  items: Candidate[];
  framework: FrameworkDef;
  onHighlight: (c: Candidate) => void;
  onAddToPom: (c: Candidate) => void;
  withHealing: boolean;
}) {
  const [open, setOpen] = useState(section !== 'fallback' && section !== 'axes');

  return (
    <section className={`qlc-section qlc-section-${section}`}>
      <button
        type="button"
        className="qlc-section-head"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className={`qlc-section-dot qlc-section-dot-${section}`} aria-hidden />
        <span className="qlc-section-title">{SECTION_TITLE[section]}</span>
        <span className="qlc-section-count">{items.length}</span>
        <span className="qlc-section-hint">{SECTION_HINT[section]}</span>
        <span className="qlc-section-chev" aria-hidden>{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <ul className="qlc-list">
          {items.map((c, i) => (
            <LocatorRow
              key={`${c.kind}-${i}-${c.args.value || c.args.role || c.cssOrXPath || c.args.variant || ''}`}
              candidate={c}
              framework={framework}
              onHighlight={onHighlight}
              onAddToPom={onAddToPom}
              withHealing={withHealing}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
