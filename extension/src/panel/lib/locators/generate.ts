import type { Candidate, GenerateOptions, SerializedElement } from './types';
import { computeAccessibleName } from './accessibleName';
import { inferRole } from './roleMap';
import { collapseWhitespace, truncate } from '../utils/escape';
import { adjustForUniqueness, classify, getRationale, SECTION_ORDER, STABILITY_ORDER } from './stability';
import { generateSmartPatterns } from './smartPatterns';
import { generateAxes } from './axes';
import { generateRelative } from './relative';
import { applyLints } from './lint';
import { attachHealingFallbacks } from './healing';

export function generateCandidates(el: SerializedElement, opts: GenerateOptions): Candidate[] {
  const raw: Candidate[] = [];

  const role = inferRole(el.tag, el.attrs);
  const name = computeAccessibleName(el);
  if (role) {
    raw.push(make('role', 1, { role, name: name || undefined }, undefined, role && name ? `role=${role}, name="${truncate(name, 30)}"` : `role=${role}`));
  }

  const idAttr = el.attrs.id;
  if (idAttr) raw.push(make('id', 2, { value: idAttr }, undefined, 'By id'));

  const nameAttr = el.attrs.name;
  if (nameAttr) raw.push(make('name', 3, { value: nameAttr }, undefined, 'By name attribute'));

  const tid = el.attrs[opts.testIdAttribute];
  if (tid) {
    raw.push(make('testid', 0, { value: tid, attr: opts.testIdAttribute }, undefined, `data-testid: ${truncate(tid, 30)}`));
  } else {
    for (const [k, v] of Object.entries(el.testIds)) {
      raw.push(make('testid', 0, { value: v, attr: k }, undefined, `${k}: ${truncate(v, 30)}`));
      break;
    }
  }

  const text = collapseWhitespace(el.visibleText || '');
  if (text && text.length > 0 && text.length < 80) {
    raw.push(make('text', 4, { value: truncate(text, 60) }, undefined, `By text "${truncate(text, 25)}"`));
  }

  if (el.labelText) raw.push(make('label', 5, { value: collapseWhitespace(el.labelText) }, undefined, `Label "${truncate(el.labelText, 25)}"`));
  if (el.placeholder) raw.push(make('placeholder', 6, { value: el.placeholder }, undefined, `Placeholder "${truncate(el.placeholder, 25)}"`));
  if (el.alt) raw.push(make('altText', 7, { value: el.alt }, undefined, `Alt "${truncate(el.alt, 25)}"`));
  if (el.title) raw.push(make('title', 8, { value: el.title }, undefined, `Title "${truncate(el.title, 25)}"`));

  if (el.ancestorAnchor && (el.labelText || el.attrs.id || el.attrs.name)) {
    const anchor = el.ancestorAnchor.selector;
    if (el.labelText) {
      raw.push(make('chained', 10, { anchor, label: collapseWhitespace(el.labelText), descendant: '' }, undefined, `${anchor} → label "${truncate(el.labelText, 20)}"`));
    } else if (idAttr) {
      raw.push(make('chained', 10, { anchor, descendant: '#' + idAttr }, undefined, `${anchor} → #${idAttr}`));
    }
  }

  if (el.cssPath) raw.push(make('css', 20, {}, el.cssPath, 'Structural CSS path'));
  if (el.xpath) raw.push(make('xpath', 21, {}, el.xpath, 'Structural xpath'));
  if (el.xpathAbsolute) raw.push(make('xpathAbs', 30, {}, el.xpathAbsolute, 'Absolute xpath — fragile'));
  if (el.xpathPosition) raw.push(make('xpathPos', 31, {}, el.xpathPosition, 'Position-based xpath — fragile'));

  if (opts.showSmartPatterns) {
    raw.push(...generateSmartPatterns(el, opts));
  }

  if (opts.showAxes) {
    raw.push(...generateAxes(el));
  }

  raw.push(...generateRelative(el, opts));

  // Thread frame/shadow chain into every candidate
  for (const c of raw) {
    if (el.frameChain && el.frameChain.length) c.frameChain = el.frameChain;
    if (el.shadowChain && el.shadowChain.length) c.shadowChain = el.shadowChain;
  }

  return raw;
}

function make(
  kind: Candidate['kind'],
  rank: number,
  args: Record<string, string | undefined>,
  cssOrXPath?: string,
  description?: string,
): Candidate {
  const meta = classify(kind);
  return {
    kind,
    rank,
    args,
    cssOrXPath,
    matchCount: 0,
    isUnique: false,
    stability: meta.stability,
    section: meta.section,
    description,
  };
}

export function sortCandidates(list: Candidate[]): Candidate[] {
  let decorated = list.map(adjustForUniqueness).map(applyLints);
  decorated = decorated.map((c) => ({ ...c, rationale: getRationale(c) }));
  decorated = attachHealingFallbacks(decorated);
  return decorated.sort((a, b) => {
    const sec = SECTION_ORDER[a.section] - SECTION_ORDER[b.section];
    if (sec !== 0) return sec;
    const stab = STABILITY_ORDER[a.stability] - STABILITY_ORDER[b.stability];
    if (stab !== 0) return stab;
    return a.rank - b.rank;
  });
}

const RELATIVE_KIND_SET: ReadonlySet<string> = new Set([
  'rel-above',
  'rel-below',
  'rel-near',
  'rel-toLeftOf',
  'rel-toRightOf',
]);

export function buildCountSnippet(c: Candidate, opts: GenerateOptions): string {
  // Relative locators carry kinds not in Candidate.kind's literal union —
  // handle them up front to keep the per-kind switch exhaustive.
  if (RELATIVE_KIND_SET.has(c.kind)) {
    return countRelative(c.args.anchor || '', c.args.anchorKind || 'css', c.args.tag || '*');
  }
  switch (c.kind) {
    case 'role':
      return countRole(c.args.role || '', c.args.name || '');
    case 'text':
      return countText(c.args.value || '');
    case 'label':
      return countLabel(c.args.value || '');
    case 'placeholder':
      return countAttr('placeholder', c.args.value || '');
    case 'altText':
      return countAttr('alt', c.args.value || '');
    case 'title':
      return countAttr('title', c.args.value || '');
    case 'testid':
      return countAttr(c.args.attr || opts.testIdAttribute, c.args.value || '');
    case 'id':
      return `(function(){try{return document.querySelectorAll('#'+CSS.escape(${JSON.stringify(c.args.value || '')})).length}catch(e){return 0}})()`;
    case 'name':
      return countAttr('name', c.args.value || '');
    case 'css':
      return `(function(){try{return document.querySelectorAll(${JSON.stringify(c.cssOrXPath || '')}).length}catch(e){return 0}})()`;
    case 'xpath':
    case 'xpathAbs':
    case 'xpathPos':
    case 'axis-ancestor':
    case 'axis-following':
    case 'axis-preceding':
    case 'axis-followingSibling':
    case 'axis-precedingSibling':
    case 'axis-parent':
      return `(function(){try{var r=document.evaluate(${JSON.stringify(c.cssOrXPath || '')},document,null,XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,null);return r.snapshotLength}catch(e){return 0}})()`;
    case 'chained': {
      const anchor = c.args.anchor || '';
      if (c.args.label) {
        return `(function(){try{var s=document.querySelectorAll(${JSON.stringify(anchor)});var n=0;s.forEach(function(scope){var labs=scope.querySelectorAll('label');labs.forEach(function(l){if((l.textContent||'').replace(/\\s+/g,' ').trim()===${JSON.stringify(c.args.label)}){var f=l.getAttribute('for');if(f&&scope.querySelector('#'+CSS.escape(f)))n++;else if(l.querySelector('input,textarea,select'))n++}})});return n}catch(e){return 0}})()`;
      }
      const desc = c.args.descendant || '';
      return `(function(){try{var s=document.querySelectorAll(${JSON.stringify(anchor)});var n=0;s.forEach(function(scope){n+=scope.querySelectorAll(${JSON.stringify(desc)}).length});return n}catch(e){return 0}})()`;
    }
    case 'smart-placeholder':
      return c.args.variant === 'example' ? countAttr('placeholder', c.args.value || '') : '0';
    case 'smart-name':
      return c.args.variant === 'example' ? countAttr('name', c.args.value || '') : '0';
    case 'smart-id':
      return c.args.variant === 'example'
        ? `(function(){try{return document.querySelectorAll('#'+CSS.escape(${JSON.stringify(c.args.value || '')})).length}catch(e){return 0}})()`
        : '0';
    case 'smart-label':
      return c.args.variant === 'example' ? countLabel(c.args.value || '') : '0';
    case 'rel-above':
    case 'rel-below':
    case 'rel-near':
    case 'rel-toLeftOf':
    case 'rel-toRightOf':
      return '0'; // unreachable: buildCountSnippet early-returns relative kinds via RELATIVE_KIND_SET
  }
}

function countRelative(anchor: string, anchorKind: string, tag: string): string {
  if (anchorKind === 'xpath') {
    return `(function(){try{var r=document.evaluate(${JSON.stringify(anchor)},document,null,XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,null);return r.snapshotLength>0?document.querySelectorAll(${JSON.stringify(tag)}).length:0}catch(e){return 0}})()`;
  }
  return `(function(){try{return document.querySelectorAll(${JSON.stringify(anchor)}).length>0?document.querySelectorAll(${JSON.stringify(tag)}).length:0}catch(e){return 0}})()`;
}

function countAttr(attr: string, value: string): string {
  return `(function(){try{return document.querySelectorAll('['+${JSON.stringify(attr)}+'='+JSON.stringify(${JSON.stringify(value)})+']').length}catch(e){return 0}})()`;
}

function countRole(role: string, name: string): string {
  const sel = roleSelectorFallback(role);
  if (!name) {
    return `(function(){try{return document.querySelectorAll(${JSON.stringify(sel)}).length}catch(e){return 0}})()`;
  }
  return `(function(){try{var n=${JSON.stringify(name.toLowerCase())};var els=document.querySelectorAll(${JSON.stringify(sel)});var c=0;els.forEach(function(e){var t=((e.textContent||'')+' '+(e.getAttribute('aria-label')||'')+' '+(e.getAttribute('alt')||'')+' '+(e.getAttribute('title')||'')+' '+(e.getAttribute('placeholder')||'')+' '+(e.getAttribute('value')||'')).toLowerCase();if(t.indexOf(n)!==-1)c++});return c}catch(e){return 0}})()`;
}

function roleSelectorFallback(role: string): string {
  const map: Record<string, string> = {
    button: 'button,input[type=button],input[type=submit],input[type=reset],input[type=image],[role=button]',
    link: 'a[href],[role=link]',
    textbox: 'input:not([type=button]):not([type=submit]):not([type=reset]):not([type=checkbox]):not([type=radio]):not([type=image]):not([type=range]):not([type=number]):not([type=search]),textarea,[role=textbox]',
    checkbox: 'input[type=checkbox],[role=checkbox]',
    radio: 'input[type=radio],[role=radio]',
    searchbox: 'input[type=search],[role=searchbox]',
    combobox: 'select,[role=combobox]',
    heading: 'h1,h2,h3,h4,h5,h6,[role=heading]',
    img: 'img,[role=img]',
    list: 'ul,ol,menu,[role=list]',
    listitem: 'li,[role=listitem]',
    dialog: 'dialog,[role=dialog]',
    tab: '[role=tab]',
    tabpanel: '[role=tabpanel]',
    navigation: 'nav,[role=navigation]',
    main: 'main,[role=main]',
    banner: 'header,[role=banner]',
    contentinfo: 'footer,[role=contentinfo]',
    form: 'form,[role=form]',
    region: 'section,[role=region]',
    table: 'table,[role=table]',
    row: 'tr,[role=row]',
    cell: 'td,[role=cell]',
    columnheader: 'th,[role=columnheader]',
    option: 'option,[role=option]',
    slider: 'input[type=range],[role=slider]',
    spinbutton: 'input[type=number],[role=spinbutton]',
    progressbar: 'progress,[role=progressbar]',
    separator: 'hr,[role=separator]',
  };
  return map[role] || `[role=${JSON.stringify(role)}]`;
}

function countText(text: string): string {
  return `(function(){try{var q=${JSON.stringify(text.toLowerCase())};var n=0;document.querySelectorAll('*').forEach(function(e){var t='';e.childNodes.forEach(function(c){if(c.nodeType===3)t+=c.textContent||''});t=t.replace(/\\s+/g,' ').trim().toLowerCase();if(t&&t.indexOf(q)!==-1)n++});return n}catch(e){return 0}})()`;
}

function countLabel(label: string): string {
  return `(function(){try{var q=${JSON.stringify(label.toLowerCase())};var n=0;document.querySelectorAll('label').forEach(function(l){var t=(l.textContent||'').replace(/\\s+/g,' ').trim().toLowerCase();if(t.indexOf(q)===-1)return;var f=l.getAttribute('for');if(f){var x=document.getElementById(f);if(x)n++}else{var inp=l.querySelector('input,textarea,select');if(inp)n++}});return n}catch(e){return 0}})()`;
}
