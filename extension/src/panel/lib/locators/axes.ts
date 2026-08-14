import type { Candidate, LocatorKind, SerializedElement } from './types';
import { classify } from './stability';

/**
 * Relative-XPath axes: ancestor::, parent::, following::, preceding::, following-sibling::, preceding-sibling::
 * Useful when the anchor element is reliable but the target is structurally adjacent.
 */
export function generateAxes(el: SerializedElement): Candidate[] {
  const out: Candidate[] = [];

  if (!el.xpath) return out;
  const anchor = pickAxisAnchor(el);
  if (!anchor) return out;

  const tag = el.tag;
  const axes: { kind: LocatorKind; axis: string; label: string }[] = [
    { kind: 'axis-parent', axis: 'parent::*', label: 'parent::' },
    { kind: 'axis-ancestor', axis: `ancestor::${tag}[1]`, label: `ancestor::${tag}[1]` },
    { kind: 'axis-following', axis: `following::${tag}[1]`, label: `following::${tag}[1]` },
    { kind: 'axis-preceding', axis: `preceding::${tag}[1]`, label: `preceding::${tag}[1]` },
    { kind: 'axis-followingSibling', axis: `following-sibling::${tag}[1]`, label: `following-sibling::${tag}[1]` },
    { kind: 'axis-precedingSibling', axis: `preceding-sibling::${tag}[1]`, label: `preceding-sibling::${tag}[1]` },
  ];

  for (const a of axes) {
    const meta = classify(a.kind);
    const xp = `${anchor}/${a.axis}`;
    out.push({
      kind: a.kind,
      rank: 60,
      matchCount: 0,
      isUnique: false,
      stability: meta.stability,
      section: meta.section,
      args: { axis: a.label },
      cssOrXPath: xp,
      description: `relative xpath via ${a.label}`,
    });
  }

  return out;
}

function pickAxisAnchor(el: SerializedElement): string {
  if (el.attrs.id) return `//*[@id=${JSON.stringify(el.attrs.id)}]`;
  if (el.labelText) return `//label[normalize-space(.)=${JSON.stringify(el.labelText)}]`;
  if (el.visibleText && el.visibleText.length < 60) return `//*[normalize-space(.)=${JSON.stringify(el.visibleText)}]`;
  return el.xpath;
}
