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
  const roleCandidate = role ? make('role', 1, { role, name: name || undefined }, undefined, role && name ? `role=${role}, name="${truncate(name, 30)}"` : `role=${role}`) : null;
  if (roleCandidate) raw.push(roleCandidate);

  // role + nth disambiguator — when several elements share role/name, Playwright's
  // "other locators" guidance is to pick by index: getByRole(...).nth(k).
  if (roleCandidate && el.roleIndex >= 0) {
    raw.push(
      make(
        'role-nth',
        1,
        { role, name: name || undefined, index: String(el.roleIndex) },
        undefined,
        `role=${role}${name ? `, name="${truncate(name, 30)}"` : ''} → nth(${el.roleIndex})`,
      ),
    );
  }

  // Scoped role strategy — role+name restricted to a unique container.
  // Follows the "scope with an ancestor" convention used across all
  // automation frameworks when a bare role/name is not unique.
  if (roleCandidate && el.uniqueTextAnchor) {
    const anchorSel = el.uniqueTextAnchor.selector;
    raw.push(
      make(
        'scoped-role',
        1,
        { anchor: anchorSel, anchorXPath: el.uniqueTextAnchor.xpath || '', role, name: name || undefined },
        undefined,
        `${anchorSel} → role=${role}${name ? `, name="${truncate(name, 30)}"` : ''}`,
      ),
    );
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
    // text + nth disambiguator — when several elements share the same text, pick
    // the exact one by document-order index (Playwright "other locators" guide).
    if (el.textIndex >= 0) {
      raw.push(
        make(
          'text-nth',
          4,
          { value: truncate(text, 60), index: String(el.textIndex) },
          undefined,
          `text "${truncate(text, 25)}" → nth(${el.textIndex})`,
        ),
      );
    }
    // Generate scoped text locator using ancestor anchor for better specificity
    const scoped = generateScopedText(el, text);
    if (scoped) raw.push(scoped);
  }

  if (el.labelText) raw.push(make('label', 5, { value: collapseWhitespace(el.labelText) }, undefined, `Label "${truncate(el.labelText, 25)}"`));
  if (el.placeholder) raw.push(make('placeholder', 6, { value: el.placeholder }, undefined, `Placeholder "${truncate(el.placeholder, 25)}"`));
  if (el.alt) raw.push(make('altText', 7, { value: el.alt }, undefined, `Alt "${truncate(el.alt, 25)}"`));
  if (el.title) raw.push(make('title', 8, { value: el.title }, undefined, `Title "${truncate(el.title, 25)}"`));

  // SVG elements (svg / path / g / use …) — Playwright & friends locate these by
  // CSS, so emit a dedicated, attribute-anchored selector rather than a raw tag.
  if (el.isSvg) {
    const svgSel = svgSelector(el);
    if (svgSel) raw.push(make('svg', 0, { value: svgSel }, svgSel, `SVG <${el.tag}> ${truncate(svgSel, 30)}`));
  }

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

/**
 * Generates a scoped text locator that chains the element's text with a unique
 * ancestor anchor. This provides better specificity when plain text matches
 * multiple elements on the page.
 */
function generateScopedText(el: SerializedElement, text: string): Candidate | null {
  const anchor = el.uniqueTextAnchor;
  if (!anchor) return null;
  return make(
    'scoped-text',
    5,
    { anchor: anchor.selector, anchorXPath: anchor.xpath, value: text },
    undefined,
    `${anchor.selector} → text "${truncate(text, 25)}"`,
  );
}

/**
 * Builds the most specific, stable CSS selector for an SVG node: prefer a
 * unique id, then a test attribute, then aria-label / title / role, then a
 * non-autogenerated class. Returns '' when the node has no identifying
 * attribute so a useless bare-tag `svg`/`rect` locator is never emitted.
 */
function svgSelector(el: SerializedElement): string {
  const tag = el.tag || 'svg';
  if (el.attrs.id) return `#${cssEscape(el.attrs.id)}`;
  for (const [k, v] of Object.entries(el.testIds)) return `[${k}=${JSON.stringify(v)}]`;
  if (el.ariaLabel) return `${tag}[aria-label=${JSON.stringify(el.ariaLabel)}]`;
  if (el.title) return `${tag}[title=${JSON.stringify(el.title)}]`;
  if (el.attrs.role) return `[role=${JSON.stringify(el.attrs.role)}]`;
  if (el.attrs.class) {
    const cls = el.attrs.class.split(/\s+/).find((c) => c && !/^css-[a-z0-9]+$/i.test(c) && !/^[a-zA-Z]+-[a-f0-9]{5,}$/.test(c));
    if (cls) return `${tag}.${cssEscape(cls)}`;
  }
  return '';
}

function cssEscape(s: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(s);
  return s.replace(/[^A-Za-z0-9_-]/g, (c) => '\\' + c);
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
  return wrapCount(buildCountSnippetRaw(c, opts), c);
}

function buildCountSnippetRaw(c: Candidate, opts: GenerateOptions): string {
  // Relative locators carry kinds not in Candidate.kind's literal union —
  // handle them up front to keep the per-kind switch exhaustive.
  if (RELATIVE_KIND_SET.has(c.kind)) {
    return countRelative(c.args.anchor || '', c.args.anchorKind || 'css', c.args.tag || '*');
  }
  switch (c.kind) {
    case 'role':
      return countRole(c.args.role || '', c.args.name || '');
    case 'role-nth': {
      // Disambiguated by index: matches exactly 1 when that index exists.
      const roleArg = c.args.role || '';
      const nameArg = c.args.name || '';
      const index = Number(c.args.index);
      const sel = roleSelectorFallback(roleArg);
      if (!nameArg) {
        return `(function(){try{var els=document.querySelectorAll(${JSON.stringify(sel)});return els.length>${index}?1:0}catch(e){return 0}})()`;
      }
      return `(function(){try{var q=${JSON.stringify(nameArg.toLowerCase())};var els=document.querySelectorAll(${JSON.stringify(sel)});var c=0;for(var i=0;i<els.length;i++){if(__qlcName(els[i]).toLowerCase()===q){if(c===${index})return 1;c++}}return 0}catch(e){return 0}})()`;
    }
    case 'scoped-role': {
      const anchor = c.args.anchor || '';
      const roleArg = c.args.role || '';
      const nameArg = c.args.name || '';
      const sel = roleSelectorFallback(roleArg);
      if (!nameArg) {
        return `(function(){try{var n=0;document.querySelectorAll(${JSON.stringify(anchor)}).forEach(function(scope){n+=scope.querySelectorAll(${JSON.stringify(sel)}).length});return n}catch(e){return 0}})()`;
      }
      return `(function(){try{var n=0;var q=${JSON.stringify(nameArg.toLowerCase())};document.querySelectorAll(${JSON.stringify(anchor)}).forEach(function(scope){scope.querySelectorAll(${JSON.stringify(sel)}).forEach(function(e){if(__qlcName(e).toLowerCase()===q)n++})});return n}catch(e){return 0}})()`;
    }
    case 'text':
      return countText(c.args.value || '');
    case 'text-nth': {
      const value = c.args.value || '';
      const index = Number(c.args.index);
      return `(function(){try{var q=${JSON.stringify(value.toLowerCase())};var n=0;var els=document.querySelectorAll('*');for(var i=0;i<els.length;i++){var e=els[i];var t='';e.childNodes.forEach(function(c){if(c.nodeType===3)t+=c.textContent||''});t=t.replace(/\\s+/g,' ').trim().toLowerCase();if(t===q){if(n===${index})return 1;n++}}return 0}catch(e){return 0}})()`;
    }
    case 'scoped-text': {
      const anchor = c.args.anchor || '';
      const value = c.args.value || '';
      return `(function(){try{var s=document.querySelectorAll(${JSON.stringify(anchor)});var n=0;var q=${JSON.stringify(value.toLowerCase())};s.forEach(function(scope){scope.querySelectorAll('*').forEach(function(e){var t='';e.childNodes.forEach(function(c){if(c.nodeType===3)t+=c.textContent||''});t=t.replace(/\\s+/g,' ').trim().toLowerCase();if(t===q)n++})});return n}catch(e){return 0}})()`;
    }
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
    case 'svg':
      return `(function(){try{return document.querySelectorAll(${JSON.stringify(c.args.value || '')}).length}catch(e){return 0}})()`;
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
  return `(function(){try{var n=${JSON.stringify(name.toLowerCase())};var c=0;document.querySelectorAll(${JSON.stringify(sel)}).forEach(function(e){if(__qlcName(e).toLowerCase()===n)c++});return c}catch(e){return 0}})()`;
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

/**
 * Runtime prelude injected into eval snippets so live counts / highlights work
 * when the target lives inside same-origin iframes (nested) and/or open shadow
 * roots. It resolves the frame document from the candidate's frameChain and
 * installs a `document` shim whose query methods pierce every open shadow root.
 *
 * Must be inlined into a function body (it declares `var document` to shadow
 * the global for the snippet that follows).
 */
export function runtimePrelude(c: Candidate): string {
  const frames = JSON.stringify(c.frameChain || []);
  const shadows = JSON.stringify(c.shadowChain || []);
  return `
    var __qlcTop = window.document;
    var __qlcFrameChain = ${frames};
    var __qlcShadowChain = ${shadows};
    function __qlcDeep(root, sel){
      var out = [];
      function walk(node){
        var found; try { found = node.querySelectorAll(sel); } catch(e){ return; }
        for (var i = 0; i < found.length; i++) out.push(found[i]);
        var kids = node.querySelectorAll('*');
        for (var j = 0; j < kids.length; j++){ if (kids[j].shadowRoot) walk(kids[j].shadowRoot); }
      }
      walk(root);
      return out;
    }
    function __qlcResolveDoc(){
      var d = __qlcTop;
      for (var i = 0; i < __qlcFrameChain.length; i++){
        var f = __qlcDeep(d, __qlcFrameChain[i])[0];
        if (!f) return null;
        var nd = f.contentDocument || (f.contentWindow && f.contentWindow.document);
        if (!nd) return null;
        d = nd;
      }
      return d;
    }
    var __qlcDoc = __qlcResolveDoc();
    if (!__qlcDoc) return 0;
    // Locators for shadow elements are emitted scoped to their host, so counts
    // must be measured inside the deepest shadow root (not the whole document).
    function __qlcScopeOf(){
      var root = __qlcDoc;
      for (var i = 0; i < __qlcShadowChain.length; i++){
        var host = __qlcDeep(root, __qlcShadowChain[i])[0];
        if (!host) return root;
        root = host.shadowRoot || host;
      }
      return root;
    }
    var __qlcScope = __qlcScopeOf();
    function __qlcText(n){ return String((n && n.textContent) || '').replace(/\\s+/g, ' ').trim(); }
    function __qlcLabel(n){
      if (n.id) { var lab = document.querySelector('label[for=' + JSON.stringify(n.id) + ']'); if (lab) return __qlcText(lab); }
      var p = n.parentElement;
      while (p) { if (p.tagName && p.tagName.toLowerCase() === 'label') return __qlcText(p); p = p.parentElement; }
      return '';
    }
    function __qlcName(n){
      var by = (n.getAttribute('aria-labelledby') || '').split(/\\s+/).filter(Boolean);
      if (by.length) {
        var t = by.map(function(id){ var r = document.getElementById(id); return r ? __qlcText(r) : ''; }).filter(Boolean).join(' ');
        if (t) return t.replace(/\\s+/g, ' ').trim();
      }
      var al = n.getAttribute('aria-label');
      if (al) return al.replace(/\\s+/g, ' ').trim();
      var lab = __qlcLabel(n);
      if (lab) return lab;
      var tag = n.tagName.toLowerCase();
      if (tag === 'img' && n.getAttribute('alt')) return __qlcText({ textContent: n.getAttribute('alt') });
      if (tag === 'input') {
        var ty = (n.getAttribute('type') || 'text').toLowerCase();
        if (ty === 'submit' || ty === 'reset' || ty === 'button') return String(n.getAttribute('value') || '').replace(/\\s+/g, ' ').trim();
        if (ty === 'image') return String(n.getAttribute('alt') || '').replace(/\\s+/g, ' ').trim();
        return n.getAttribute('placeholder') ? String(n.getAttribute('placeholder')).replace(/\\s+/g, ' ').trim() : '';
      }
      if (tag === 'button' || /^h[1-6]$/.test(tag) || tag === 'a' || tag === 'summary') return __qlcText(n);
      var ti = n.getAttribute('title');
      return ti ? String(ti).replace(/\\s+/g, ' ').trim() : '';
    }
    var document = {
      querySelectorAll: function(s){ return __qlcDeep(__qlcScope, s); },
      querySelector: function(s){ var a = __qlcDeep(__qlcScope, s); return a.length ? a[0] : null; },
      getElementById: function(id){ var a = []; try { a = __qlcDeep(__qlcScope, '#' + CSS.escape(id)); } catch(e){} return a.length ? a[0] : null; },
      evaluate: function(x){ return __qlcScope.evaluate(x, __qlcScope, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null); }
    };
  `;
}

function wrapCount(inner: string, c: Candidate): string {
  return `(function(){try{${runtimePrelude(c)}\nreturn ${inner};}catch(e){return 0}})()`;
}
