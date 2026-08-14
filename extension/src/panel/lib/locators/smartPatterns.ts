import type { Candidate, GenerateOptions, SerializedElement } from './types';
import { classify } from './stability';

const FORMABLE = new Set(['input', 'textarea', 'select']);

export function generateSmartPatterns(el: SerializedElement, _opts: GenerateOptions): Candidate[] {
  if (!FORMABLE.has(el.tag)) return [];
  const out: Candidate[] = [];

  if (el.placeholder) {
    pushPair(out, 'smart-placeholder', el.placeholder, 'placeholder', el.tag);
  }
  const nameAttr = el.attrs.name;
  if (nameAttr) {
    pushPair(out, 'smart-name', nameAttr, 'name', el.tag);
  }
  const idAttr = el.attrs.id;
  if (idAttr) {
    pushPair(out, 'smart-id', idAttr, 'id', el.tag);
  }
  if (el.labelText) {
    pushPair(out, 'smart-label', el.labelText, 'label', el.tag);
  }

  return out;
}

function pushPair(
  out: Candidate[],
  kind: Candidate['kind'],
  value: string,
  paramName: string,
  tag: string,
): void {
  const meta = classify(kind);
  out.push({
    kind,
    rank: 50,
    matchCount: 0,
    isUnique: false,
    stability: meta.stability,
    section: meta.section,
    args: { variant: 'example', value, paramName },
    template: { tag },
    description: `Find ${tag} by ${paramName}`,
  });
  out.push({
    kind,
    rank: 51,
    matchCount: 0,
    isUnique: false,
    stability: meta.stability,
    section: meta.section,
    args: { variant: 'template', value, paramName },
    template: { tag },
    description: `Template — replace \${${paramName}} with runtime value`,
  });
}
