export function quoteJS(s: string): string {
  return JSON.stringify(s);
}

export function quotePython(s: string): string {
  if (!s.includes("'") && !s.includes('\\') && !s.includes('\n')) return `'${s}'`;
  return JSON.stringify(s);
}

export function quoteJava(s: string): string {
  return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t') + '"';
}

export function truncate(s: string, max = 80): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

export function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}
