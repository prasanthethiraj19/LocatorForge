import type { SerializedElement } from './types';

export function computeAccessibleName(el: SerializedElement): string {
  if (el.ariaLabelledByText) return collapse(el.ariaLabelledByText);
  if (el.ariaLabel) return collapse(el.ariaLabel);
  if (el.labelText) return collapse(el.labelText);

  const tag = el.tag;
  if (tag === 'img' && el.alt) return collapse(el.alt);
  if (tag === 'input') {
    const t = (el.attrs.type || 'text').toLowerCase();
    if (t === 'submit' || t === 'reset' || t === 'button') return collapse(el.attrs.value || '');
    if (t === 'image') return collapse(el.alt);
    if (el.placeholder) return collapse(el.placeholder);
    return '';
  }
  if (tag === 'button' || /^h[1-6]$/.test(tag) || tag === 'a' || tag === 'summary') {
    return collapse(el.visibleText || el.textContent);
  }
  if (el.title) return collapse(el.title);
  return '';
}

function collapse(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}
