import type { Candidate } from '../locators/types';

export function suggestFieldName(c: Candidate): string {
  let seed = c.args.value || c.args.role || c.args.name || c.args.label || c.cssOrXPath || c.kind;
  if (c.kind === 'role' && c.args.name) seed = `${c.args.role}_${c.args.name}`;
  return camel(seed);
}

export function camel(input: string): string {
  const parts = input
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 5);
  if (parts.length === 0) return 'el';
  return parts
    .map((w, i) =>
      i === 0
        ? w.toLowerCase()
        : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
    )
    .join('');
}

export function pascal(input: string): string {
  const c = camel(input);
  return c.charAt(0).toUpperCase() + c.slice(1);
}

export function snake(input: string): string {
  return camel(input)
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

export function dedupeFieldNames(items: { fieldName: string }[]): void {
  const counts = new Map<string, number>();
  for (const it of items) {
    const n = (counts.get(it.fieldName) || 0) + 1;
    counts.set(it.fieldName, n);
    if (n > 1) it.fieldName = it.fieldName + n;
  }
}
