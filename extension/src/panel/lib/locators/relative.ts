import type {
  AnyLocatorKind,
  Candidate,
  GenerateOptions,
  LocatorKind,
  RelativeAnchor,
  SerializedElement,
} from './types';
import { classify } from './stability';
import { collapseWhitespace, truncate } from '../utils/escape';

/**
 * Selenium 4 relative locators: above / below / near / toLeftOf / toRightOf.
 *
 * SerializedElement does not carry geometric data — we infer plausible spatial
 * relations from semantic cues:
 *   - labelText that resolves to <label for="id"> → input is toRightOf that label
 *   - labelText only (wrapped label or aria-labelledby) → input is near that label
 *   - ancestorAnchor (form / dialog / section landmark) → element is near anchor
 *   - input with a placeholder/name that hints at a submit pair → below a heading
 *
 * Max 3 relative candidates are emitted to avoid clutter.
 */
export function generateRelative(el: SerializedElement, _opts: GenerateOptions): Candidate[] {
  const anchors: RelativeAnchor[] = [];

  const labelText = collapseWhitespace(el.labelText || '');
  const idAttr = el.attrs.id;

  // 1) Label paired via for/id — emit toRightOf (labels typically sit left of input)
  if (labelText && idAttr) {
    anchors.push({
      kind: 'rel-toRightOf',
      selector: `label[for=${JSON.stringify(idAttr)}]`,
      selectorKind: 'css',
      label: labelText,
      tag: el.tag,
    });
  } else if (labelText) {
    // 2) Label without explicit pairing — emit toRightOf via xpath text match
    anchors.push({
      kind: 'rel-toRightOf',
      selector: `//label[normalize-space()=${JSON.stringify(labelText)}]`,
      selectorKind: 'xpath',
      label: labelText,
      tag: el.tag,
    });
  }

  // 3) For form fields, suggest "below" a likely heading anchor when one
  // can be guessed from ancestorAnchor.
  const isFormField = el.tag === 'input' || el.tag === 'textarea' || el.tag === 'select';
  if (isFormField && el.ancestorAnchor) {
    anchors.push({
      kind: 'rel-below',
      selector: `${el.ancestorAnchor.selector} :is(h1,h2,h3,h4,h5,h6,legend)`,
      selectorKind: 'css',
      label: 'section heading',
      tag: el.tag,
    });
  }

  // 4) ancestorAnchor itself — emit a near() candidate (works on any element)
  if (el.ancestorAnchor) {
    anchors.push({
      kind: 'rel-near',
      selector: el.ancestorAnchor.selector,
      selectorKind: 'css',
      label: el.ancestorAnchor.selector,
      tag: el.tag,
    });
  }

  // Clip to a maximum of 3 candidates to keep the panel readable.
  const out: Candidate[] = [];
  for (const a of anchors.slice(0, 3)) {
    out.push(buildCandidate(a));
  }
  return out;
}

function buildCandidate(a: RelativeAnchor): Candidate {
  const meta = classify(a.kind);
  const labelText = a.label ? truncate(a.label, 30) : a.selector;
  const verb = verbFor(a.kind);
  return {
    // a.kind is a RelativeLocatorKind; surface it at runtime through
    // Candidate.kind (LocatorKind) via AnyLocatorKind so callers that
    // exhaustively handle relative kinds still match it.
    kind: a.kind as unknown as LocatorKind,
    rank: 12,
    matchCount: 0,
    isUnique: false,
    stability: meta.stability,
    section: meta.section,
    args: {
      anchor: a.selector,
      anchorKind: a.selectorKind,
      anchorLabel: a.label,
      tag: a.tag,
    },
    description: `${a.tag} ${verb} ${labelText}`,
  };
}

// Re-export to silence "unused import" when AnyLocatorKind isn't directly
// referenced — it documents the intent of the cast above.
export type { AnyLocatorKind };

function verbFor(kind: RelativeAnchor['kind']): string {
  switch (kind) {
    case 'rel-above': return 'above';
    case 'rel-below': return 'below';
    case 'rel-near': return 'near';
    case 'rel-toLeftOf': return 'toLeftOf';
    case 'rel-toRightOf': return 'toRightOf';
  }
}
