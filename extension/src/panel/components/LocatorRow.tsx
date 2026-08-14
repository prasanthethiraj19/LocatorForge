import type { Candidate, FrameworkDef } from '../lib/locators/types';
import { formatExpression, formatWithVariable, formatFullStatement } from '../lib/locators/format';
import { StabilityBadge } from './StabilityBadge';
import { CopyMenu } from './CopyMenu';
import { LintBadge } from './LintBadge';

interface Props {
  candidate: Candidate;
  framework: FrameworkDef;
  onHighlight: (c: Candidate) => void;
  onAddToPom: (c: Candidate) => void;
  withHealing: boolean;
}

const KIND_LABEL: Record<Candidate['kind'], string> = {
  role: 'role',
  text: 'text',
  label: 'label',
  placeholder: 'placeholder',
  altText: 'alt',
  title: 'title',
  testid: 'testId',
  id: 'id',
  name: 'name',
  css: 'css',
  xpath: 'xpath',
  xpathAbs: 'xpath·abs',
  xpathPos: 'xpath·pos',
  chained: 'chained',
  'smart-placeholder': 'placeholder',
  'smart-name': 'name',
  'smart-id': 'id',
  'smart-label': 'label',
  'axis-ancestor': 'ancestor',
  'axis-following': 'following',
  'axis-preceding': 'preceding',
  'axis-followingSibling': 'sibling+',
  'axis-precedingSibling': 'sibling−',
  'axis-parent': 'parent',
  'rel-above': 'above',
  'rel-below': 'below',
  'rel-near': 'near',
  'rel-toLeftOf': 'toLeftOf',
  'rel-toRightOf': 'toRightOf',
};

function kindClassOf(kind: Candidate['kind']): string {
  if (kind.startsWith('smart-')) return 'smart';
  if (kind.startsWith('axis-')) return 'axis';
  if (kind.startsWith('rel-')) return 'rel';
  return kind;
}

export function LocatorRow({ candidate, framework, onHighlight, onAddToPom, withHealing }: Props) {
  const expr = formatExpression(candidate, { framework, withHealing });

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); } catch {}
  }

  const matchClass = candidate.matchCount === 0
    ? 'qlc-cnt qlc-cnt-zero'
    : candidate.isUnique
    ? 'qlc-cnt qlc-cnt-unique'
    : candidate.matchCount <= 5
    ? 'qlc-cnt qlc-cnt-few'
    : 'qlc-cnt qlc-cnt-many';

  const matchLabel = candidate.matchCount === 0
    ? 'no match'
    : candidate.isUnique
    ? '1 match'
    : `${candidate.matchCount} matches`;

  const kindClass = kindClassOf(candidate.kind);
  const hasFrame = !!(candidate.frameChain && candidate.frameChain.length);
  const hasShadow = !!(candidate.shadowChain && candidate.shadowChain.length);
  const hasHealing = withHealing && !!(candidate.healingFallbacks && candidate.healingFallbacks.length);

  return (
    <li className={`qlc-row qlc-row-${candidate.section} ${candidate.isUnique ? 'qlc-row-unique' : ''}`}>
      <div className="qlc-row-head">
        <span className={`qlc-kind qlc-kind-${kindClass}`}>{KIND_LABEL[candidate.kind]}</span>
        <StabilityBadge stability={candidate.stability} candidate={candidate} />
        <span className={matchClass}>{matchLabel}</span>
        {hasFrame && <span className="qlc-flag-pill" title={`Inside iframe: ${candidate.frameChain!.join(' › ')}`}>iframe</span>}
        {hasShadow && <span className="qlc-flag-pill" title={`Inside shadow root: ${candidate.shadowChain!.join(' › ')}`}>shadow</span>}
        {hasHealing && <span className="qlc-flag-pill qlc-flag-heal" title="Self-healing chain (.or fallbacks)">heal+{candidate.healingFallbacks!.length}</span>}
        <LintBadge findings={candidate.lints || []} />
        {candidate.description && <span className="qlc-desc" title={candidate.description}>{candidate.description}</span>}
        <div className="qlc-row-actions">
          <button
            type="button"
            className="qlc-icon-btn"
            onClick={() => onHighlight(candidate)}
            title="Highlight on page"
          >
            ◎
          </button>
          <button
            type="button"
            className="qlc-icon-btn"
            onClick={() => onAddToPom(candidate)}
            title="Add to Page Object basket"
          >
            +
          </button>
          <CopyMenu
            onCopyOnly={() => copy(expr)}
            onCopyVariable={() => copy(formatWithVariable(candidate, { framework, withHealing }))}
            onCopyStatement={() => copy(formatFullStatement(candidate, { framework, withHealing }))}
          />
        </div>
      </div>
      <code className="qlc-expr">{expr}</code>
    </li>
  );
}
