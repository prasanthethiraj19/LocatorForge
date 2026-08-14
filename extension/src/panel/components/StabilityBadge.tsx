import type { Candidate, Stability } from '../lib/locators/types';
import { STABILITY_STARS, STABILITY_LABEL, getRationale } from '../lib/locators/stability';

interface Props {
  stability: Stability;
  candidate?: Candidate;
}

export function StabilityBadge({ stability, candidate }: Props) {
  const rationale = candidate
    ? candidate.rationale || getRationale(candidate)
    : '';
  const tooltip = rationale
    ? `${STABILITY_LABEL[stability]} — ${rationale}`
    : STABILITY_LABEL[stability];
  return (
    <span className={`qlc-stab qlc-stab-${stability}`} title={tooltip}>
      <span className="qlc-stab-dots">{STABILITY_STARS[stability]}</span>
      {rationale && <span className="qlc-stab-info" aria-hidden="true">ⓘ</span>}
    </span>
  );
}
