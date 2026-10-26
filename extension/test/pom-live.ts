/**
 * Live POM harness — runs the extension's REAL locator + Page Object pipeline
 * inside a real page (bundled with esbuild and injected with `agent-browser eval`).
 *
 * It serializes real DOM elements with the same `__qlcSerialize` source the panel
 * uses, generates ranked candidates, takes the top candidate per element exactly
 * like the "+" button does, and emits a Page Object with `generatePom()`.
 *
 * Exposes `window.__qlcHarvest(selectors, framework, url)`.
 */
import { SERIALIZE_FN_SOURCE } from '../src/panel/lib/locators/serialize';
import { generateCandidates, sortCandidates } from '../src/panel/lib/locators/generate';
import { generatePom } from '../src/panel/lib/pom/generate';
import { pageKeyFromUrl, suggestClassName, suggestFieldName } from '../src/panel/lib/pom/naming';
import type { GenerateOptions, SerializedElement } from '../src/panel/lib/locators/types';
import type { PomItem } from '../src/panel/lib/pom/types';

const OPTS: GenerateOptions = {
  testIdAttribute: 'data-testid',
  showSmartPatterns: true,
  showAxes: false,
  selfHealing: true,
};

const serialize: (el: Element) => SerializedElement | null = new Function(
  `${SERIALIZE_FN_SOURCE}\nreturn __qlcSerialize;`,
)() as (el: Element) => SerializedElement | null;

function harvest(selectors: string[], framework: string, url: string, max = 8) {
  const pageKey = pageKeyFromUrl(url);
  const items: PomItem[] = [];
  const skipped: string[] = [];

  for (const sel of selectors) {
    if (items.length >= max) break;
    let el: Element | null = null;
    try {
      el = document.querySelector(sel);
    } catch {
      skipped.push(`${sel} (bad selector)`);
      continue;
    }
    if (!el) {
      skipped.push(`${sel} (not found)`);
      continue;
    }
    const serialized = serialize(el);
    if (!serialized) {
      skipped.push(`${sel} (serialize failed)`);
      continue;
    }
    const candidates = sortCandidates(generateCandidates(serialized, OPTS));
    if (!candidates.length) {
      skipped.push(`${sel} (no candidate)`);
      continue;
    }
    const top = candidates[0];
    items.push({
      id: `${items.length + 1}`,
      fieldName: suggestFieldName(top),
      candidate: top,
      addedAt: Date.now(),
      pageKey,
    });
  }

  const className = suggestClassName(url);
  const code = items.length
    ? generatePom(items, { className, framework: framework as never, url })
    : '';
  return {
    url,
    pageKey,
    className,
    skipped,
    fieldNames: items.map((i) => i.fieldName),
    kinds: items.map((i) => i.candidate.kind),
    locators: items.map((i) => i.candidate.args),
    items,
    code,
  };
}

(window as unknown as Record<string, unknown>).__qlcHarvest = harvest;
