import type { Candidate } from './types';

/**
 * For each best-section candidate, attach up to 2 alternative-section candidates as healing fallbacks.
 * Result: when emitted as a chain, the primary tries first; if missing, fallbacks try.
 */
export function attachHealingFallbacks(candidates: Candidate[]): Candidate[] {
  const primaries = candidates.filter((c) => c.section === 'recommended' && c.isUnique);
  if (!primaries.length) return candidates;

  const fallbackPool = candidates.filter(
    (c) =>
      c.section !== 'fallback' &&
      c.matchCount > 0 &&
      c.kind !== 'css' &&
      c.kind !== 'xpathAbs' &&
      c.kind !== 'xpathPos',
  );

  return candidates.map((c) => {
    if (c.section !== 'recommended' || !c.isUnique) return c;
    const fallbacks = fallbackPool
      .filter((f) => f.kind !== c.kind)
      .slice(0, 2);
    if (!fallbacks.length) return c;
    return { ...c, healingFallbacks: fallbacks };
  });
}
