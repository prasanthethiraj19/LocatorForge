/**
 * Harvest interactive elements on the inspected page and emit a markdown
 * cheat sheet of recommended locators per category.
 *
 * Runs the serialize+harvest script in the page context via
 * chrome.devtools.inspectedWindow.eval, then formats results panel-side
 * using the existing generateCandidates + formatExpression pipeline.
 */

import { SERIALIZE_FN_SOURCE } from '../locators/serialize';
import { generateCandidates, sortCandidates } from '../locators/generate';
import { formatExpression } from '../locators/format';
import type { FrameworkDef, SerializedElement } from '../locators/types';

export type HarvestCategory =
  | 'Buttons'
  | 'Links'
  | 'Inputs'
  | 'Selects'
  | 'Headings'
  | 'Other interactive';

export interface HarvestEntry {
  category: HarvestCategory;
  description: string;
  element: SerializedElement;
}

/**
 * Script source that runs in the inspected page. Walks visible interactive
 * elements, serializes each one, classifies into a category, and returns the
 * array. Uses the same __qlcSerialize() as the single-element flow.
 */
const HARVEST_FN_SOURCE = `
${SERIALIZE_FN_SOURCE}

function __qlcHarvest() {
  function isVisible(el) {
    if (!el || el.nodeType !== 1) return false;
    var r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    var cs = (el.ownerDocument && el.ownerDocument.defaultView)
      ? el.ownerDocument.defaultView.getComputedStyle(el)
      : null;
    if (cs && (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0')) return false;
    return true;
  }

  function categoryFor(el) {
    var tag = el.tagName.toLowerCase();
    var role = (el.getAttribute('role') || '').toLowerCase();
    var type = (el.getAttribute('type') || '').toLowerCase();
    if (tag === 'button' || role === 'button' || (tag === 'input' && (type === 'button' || type === 'submit' || type === 'reset' || type === 'image'))) {
      return 'Buttons';
    }
    if (tag === 'a' || role === 'link') return 'Links';
    if (tag === 'select' || role === 'combobox' || role === 'listbox') return 'Selects';
    if (tag === 'input' || tag === 'textarea' || role === 'textbox' || role === 'searchbox') return 'Inputs';
    if (/^h[1-6]$/.test(tag) || role === 'heading') return 'Headings';
    return 'Other interactive';
  }

  function shortDescription(el) {
    var label = el.getAttribute('aria-label') || el.getAttribute('alt') || el.getAttribute('title') || el.getAttribute('placeholder');
    if (!label) {
      var txt = (el.textContent || '').replace(/\\s+/g, ' ').trim();
      if (txt) label = txt.slice(0, 60);
    }
    if (!label) label = el.tagName.toLowerCase();
    return label;
  }

  var SELECTOR = [
    'button',
    'a[href]',
    'input:not([type=hidden])',
    'select',
    'textarea',
    '[role=button]',
    '[role=link]',
    '[role=textbox]',
    '[role=searchbox]',
    '[role=combobox]',
    '[role=checkbox]',
    '[role=radio]',
    '[role=tab]',
    '[role=menuitem]',
    '[contenteditable=true]',
    'h1','h2','h3','h4','h5','h6',
    '[role=heading]'
  ].join(',');

  var nodes = Array.prototype.slice.call(document.querySelectorAll(SELECTOR));
  var seen = new Set();
  var out = [];
  var CAP = 250; // safety cap

  for (var i = 0; i < nodes.length && out.length < CAP; i++) {
    var el = nodes[i];
    if (seen.has(el)) continue;
    seen.add(el);
    if (!isVisible(el)) continue;
    var ser = __qlcSerialize(el);
    if (!ser) continue;
    out.push({
      category: categoryFor(el),
      description: shortDescription(el),
      element: ser
    });
  }
  return out;
}

__qlcHarvest()
`;

/**
 * Order in the generated markdown.
 */
const CATEGORY_ORDER: HarvestCategory[] = [
  'Buttons',
  'Links',
  'Inputs',
  'Selects',
  'Headings',
  'Other interactive',
];

/**
 * Run the harvester in the inspected page. Resolves with the harvested
 * entries or rejects on eval error.
 */
export function harvestRaw(): Promise<HarvestEntry[]> {
  return new Promise((resolve, reject) => {
    try {
      chrome.devtools.inspectedWindow.eval(HARVEST_FN_SOURCE, (result, exc) => {
        if (exc) {
          const desc =
            (exc as { description?: string; value?: string }).description ||
            (exc as { value?: string }).value ||
            'eval error';
          reject(new Error(desc));
          return;
        }
        const arr = Array.isArray(result) ? (result as HarvestEntry[]) : [];
        resolve(arr);
      });
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)));
    }
  });
}

export interface HarvestOptions {
  inspectedUrl: string;
  framework: FrameworkDef;
  testIdAttribute: string;
  showSmart: boolean;
}

/**
 * Truncate long descriptions for markdown row labels.
 */
function truncate(s: string, max = 60): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

/**
 * Escape backticks inside an inline-code fence by switching to triple-tick
 * pairs would be heavy; just replace backticks in input with a similar char.
 */
function safeCode(s: string): string {
  return s.replace(/`/g, 'ˋ');
}

/**
 * Full pipeline: harvest from page → for each entry, generate top recommended
 * locator → emit markdown grouped by category.
 */
export async function harvestPageLocators(opts: HarvestOptions): Promise<string> {
  const entries = await harvestRaw();

  const generateOpts = {
    testIdAttribute: opts.testIdAttribute,
    showSmartPatterns: opts.showSmart,
    selfHealing: false,
    showAxes: false,
  };

  const grouped: Record<HarvestCategory, string[]> = {
    Buttons: [],
    Links: [],
    Inputs: [],
    Selects: [],
    Headings: [],
    'Other interactive': [],
  };

  for (const entry of entries) {
    const raw = generateCandidates(entry.element, generateOpts);
    // We don't have live-counts here, so simulate uniqueness based on rank only.
    // sortCandidates will still sort by section/stability/rank.
    const sorted = sortCandidates(raw);
    // Prefer recommended section first; sortCandidates already orders that way.
    const top = sorted[0];
    if (!top) continue;
    const expr = formatExpression(top, {
      framework: opts.framework,
      withHealing: false,
      withFrameLocator: true,
    });
    const desc = truncate(entry.description);
    const cat = entry.category;
    grouped[cat].push(`- **${desc}**: \`${safeCode(expr)}\``);
  }

  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const lines: string[] = [];
  lines.push(`# Page locators — ${opts.inspectedUrl || '(unknown URL)'} (${ts})`);
  lines.push('');
  lines.push(`_Framework: ${opts.framework.label}_`);
  lines.push('');

  let total = 0;
  for (const cat of CATEGORY_ORDER) {
    const rows = grouped[cat];
    if (!rows.length) continue;
    lines.push(`## ${cat}`);
    lines.push('');
    for (const r of rows) lines.push(r);
    lines.push('');
    total += rows.length;
  }

  if (total === 0) {
    lines.push('_No interactive elements found on this page._');
    lines.push('');
  }

  return lines.join('\n');
}
