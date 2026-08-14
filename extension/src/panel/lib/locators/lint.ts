import type { Candidate, LintFinding } from './types';

const CSS_CLASS_AUTOGEN = /^[a-z]+_[a-z0-9_-]{6,}$|^css-[a-z0-9]+$|^[a-zA-Z]+-[a-f0-9]{5,}$|^_[a-zA-Z0-9]+$|jsx-\d+/;

export function lintCandidate(c: Candidate): LintFinding[] {
  const out: LintFinding[] = [];
  const expr = c.cssOrXPath || '';

  if (c.kind === 'xpathAbs') {
    out.push({
      rule: 'absolute-xpath',
      severity: 'warn',
      message: 'Absolute xpath breaks on any DOM restructure — avoid in committed tests.',
    });
  }

  if (c.kind === 'xpathPos') {
    out.push({
      rule: 'position-xpath',
      severity: 'warn',
      message: 'position()=N is index-based — fragile if elements reorder.',
    });
  }

  if (c.kind === 'css' || c.kind === 'xpath') {
    if (/:nth-of-type|:nth-child/.test(expr)) {
      out.push({
        rule: 'nth-of-type',
        severity: 'warn',
        message: 'nth-of-type relies on sibling order — breaks if items add/remove/reorder.',
      });
    }
    if (/\bdiv\s*>\s*div\s*>\s*div/.test(expr)) {
      out.push({
        rule: 'div-chain',
        severity: 'warn',
        message: 'Long <div> chains are noise — prefer semantic role/label.',
      });
    }
    if (/\[\d+\]/.test(expr) && c.kind === 'xpath') {
      out.push({
        rule: 'indexed-step',
        severity: 'info',
        message: 'Indexed xpath step — usable, but role/label/testid more stable.',
      });
    }
  }

  if (c.kind === 'css' && /^\./.test(expr)) {
    const classes = expr.match(/\.[A-Za-z0-9_-]+/g) || [];
    const autogen = classes.filter((cls) => CSS_CLASS_AUTOGEN.test(cls.slice(1)));
    if (autogen.length) {
      out.push({
        rule: 'autogen-class',
        severity: 'warn',
        message: `Class ${autogen[0]} looks auto-generated (CSS-in-JS) — likely changes on rebuild.`,
      });
    }
  }

  if (c.kind === 'role' && !c.args.name) {
    out.push({
      rule: 'role-no-name',
      severity: 'info',
      message: 'role without accessible name — ambiguous if multiple of same role exist.',
    });
  }

  if (c.kind === 'text' && (c.args.value || '').length < 3) {
    out.push({
      rule: 'short-text',
      severity: 'warn',
      message: 'Very short text — likely matches many elements.',
    });
  }

  if (c.kind === 'text' && /\d{2,}/.test(c.args.value || '')) {
    out.push({
      rule: 'numeric-text',
      severity: 'info',
      message: 'Numeric text — may be dynamic (timestamps, counts, ids).',
    });
  }

  if (!c.isUnique && c.matchCount > 1) {
    out.push({
      rule: 'not-unique',
      severity: c.matchCount > 5 ? 'warn' : 'info',
      message: `Matches ${c.matchCount} elements — chain with .first() / .nth(i) or pick more specific anchor.`,
    });
  }

  if (c.matchCount === 0) {
    out.push({
      rule: 'no-match',
      severity: 'warn',
      message: 'Matches zero elements on current page — check input or page state.',
    });
  }

  return out;
}

export function applyLints(c: Candidate): Candidate {
  return { ...c, lints: lintCandidate(c) };
}
