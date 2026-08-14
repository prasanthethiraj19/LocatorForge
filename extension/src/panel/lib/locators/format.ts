import type { Candidate, FormatContext, RelativeLocatorKind } from './types';
import { quoteJS, quotePython, quoteJava } from '../utils/escape';

type Lang = 'TypeScript' | 'JavaScript' | 'Python' | 'Java' | 'Robot';

const RELATIVE_KINDS: ReadonlySet<string> = new Set<RelativeLocatorKind>([
  'rel-above',
  'rel-below',
  'rel-near',
  'rel-toLeftOf',
  'rel-toRightOf',
]);

function isRelativeKind(kind: string): kind is RelativeLocatorKind {
  return RELATIVE_KINDS.has(kind);
}

function quote(s: string, lang: Lang): string {
  if (lang === 'TypeScript' || lang === 'JavaScript') return quoteJS(s);
  if (lang === 'Python') return quotePython(s);
  if (lang === 'Java') return quoteJava(s);
  return JSON.stringify(s);
}

export function formatExpression(c: Candidate, ctx: FormatContext): string {
  const base = formatBare(c, ctx);
  let result = base;
  if (ctx.withFrameLocator !== false && c.frameChain && c.frameChain.length) {
    result = applyFrameWrap(result, c.frameChain, ctx);
  }
  if (ctx.withHealing !== false && c.healingFallbacks && c.healingFallbacks.length) {
    result = applyHealing(result, c, ctx);
  }
  return result;
}

function formatBare(c: Candidate, ctx: FormatContext): string {
  const f = ctx.framework;
  // Selenium 4 relative locators are handled outside the per-kind switches
  // because Candidate.kind is typed narrowly (LocatorKind without rel-*) so
  // the literal `case 'rel-above':` would be unreachable inside the typed
  // switch. Detect them up front via a string set and delegate.
  if (isRelativeKind(c.kind)) {
    if (f.family === 'selenium') return formatSeleniumRelative(c, f.language);
    if (f.family === 'cypress') {
      const xp = relativeXPathFallback(c).replace(/^xpath=/, '');
      return `cy.xpath(${quoteJS(xp)})`;
    }
    if (f.family === 'webdriverio') {
      const xp = relativeXPathFallback(c).replace(/^xpath=/, '');
      return `await $(${quoteJS(xp)})`;
    }
    if (f.family === 'robot') {
      const xp = relativeXPathFallback(c).replace(/^xpath=/, '');
      return `xpath:${xp}`;
    }
    // playwright family — emit xpath locator as a graceful fallback
    const xp = relativeXPathFallback(c);
    if (f.language === 'Python') return `page.locator(${quotePython(xp)})`;
    if (f.language === 'Java') return `page.locator(${quoteJava(xp)})`;
    return `page.locator(${quoteJS(xp)})`;
  }
  switch (f.family) {
    case 'playwright': return formatPlaywright(c, f.language);
    case 'selenium': return formatSelenium(c, f.language);
    case 'cypress': return formatCypress(c);
    case 'webdriverio': return formatWdio(c);
    case 'robot': return formatRobot(c);
  }
}

function applyFrameWrap(expr: string, chain: string[], ctx: FormatContext): string {
  const fam = ctx.framework.family;
  const lang = ctx.framework.language;
  if (fam === 'playwright') {
    // page.getByX(...) → page.frameLocator(...).frameLocator(...).getByX(...)
    const m = lang === 'Python' ? 'frame_locator' : 'frameLocator';
    const wrappers = chain.map((sel) => `.${m}(${quote(sel, lang)})`).join('');
    return expr.replace(/^page\./, `page${wrappers}.`);
  }
  if (fam === 'cypress') {
    // cy.iframe('iframe').find(...)
    return `cy.iframe(${quote(chain[chain.length - 1], 'JavaScript')}).find(${quote('TODO', 'JavaScript')}) /* nested: ${expr} */`;
  }
  if (fam === 'selenium') {
    const head = lang === 'Python' ? '# switch into iframe first' : '// switch into iframe first';
    const sw = lang === 'Python'
      ? chain.map((s) => `driver.switch_to.frame(driver.find_element(By.CSS_SELECTOR, ${quotePython(s)}))`).join('\n')
      : chain.map((s) => `driver.switchTo().frame(driver.findElement(By.cssSelector(${quoteJava(s)})));`).join('\n');
    return `${head}\n${sw}\n${expr}`;
  }
  if (fam === 'webdriverio') {
    const sw = chain.map((s) => `await browser.switchToFrame(await $(${quoteJS(s)}));`).join('\n');
    return `${sw}\n${expr}`;
  }
  if (fam === 'robot') {
    const sw = chain.map((s) => `Select Frame    css:${s}`).join('\n');
    return `${sw}\n${expr}`;
  }
  return expr;
}

function applyHealing(primary: string, c: Candidate, ctx: FormatContext): string {
  if (!c.healingFallbacks || !c.healingFallbacks.length) return primary;
  const fam = ctx.framework.family;
  const lang = ctx.framework.language;
  if (fam === 'playwright') {
    const fallbacks = c.healingFallbacks
      .map((f) => formatBare(f, ctx))
      .map((expr) => expr.replace(/^page\./, ''));
    const tail = fallbacks.map((f) => `.or(page.${f})`).join('');
    return primary + tail;
  }
  // Other frameworks: append code comment with alternatives
  const list = c.healingFallbacks.map((f) => formatBare(f, ctx));
  const prefix = lang === 'Python' || lang === 'Robot' ? '# ' : '// ';
  return primary + `\n${prefix}healing fallbacks: ${list.join(' | ')}`;
}

function formatPlaywright(c: Candidate, lang: Lang): string {
  const q = (s: string) => quote(s, lang);
  const page = 'page.';
  switch (c.kind) {
    case 'role': {
      const role = c.args.role || '';
      const name = c.args.name;
      if (lang === 'Java') {
        const roleEnum = `AriaRole.${role.toUpperCase().replace(/-/g, '_')}`;
        if (name) return `${page}getByRole(${roleEnum}, new Page.GetByRoleOptions().setName(${q(name)}))`;
        return `${page}getByRole(${roleEnum})`;
      }
      const m = lang === 'Python' ? 'get_by_role' : 'getByRole';
      if (name) {
        if (lang === 'Python') return `${page}${m}(${q(role)}, name=${q(name)})`;
        return `${page}${m}(${q(role)}, { name: ${q(name)} })`;
      }
      return `${page}${m}(${q(role)})`;
    }
    case 'text': {
      const m = lang === 'Python' ? 'get_by_text' : 'getByText';
      return `${page}${m}(${q(c.args.value || '')})`;
    }
    case 'label': {
      const m = lang === 'Python' ? 'get_by_label' : 'getByLabel';
      return `${page}${m}(${q(c.args.value || '')})`;
    }
    case 'placeholder': {
      const m = lang === 'Python' ? 'get_by_placeholder' : 'getByPlaceholder';
      return `${page}${m}(${q(c.args.value || '')})`;
    }
    case 'altText': {
      const m = lang === 'Python' ? 'get_by_alt_text' : 'getByAltText';
      return `${page}${m}(${q(c.args.value || '')})`;
    }
    case 'title': {
      const m = lang === 'Python' ? 'get_by_title' : 'getByTitle';
      return `${page}${m}(${q(c.args.value || '')})`;
    }
    case 'testid': {
      const m = lang === 'Python' ? 'get_by_test_id' : 'getByTestId';
      return `${page}${m}(${q(c.args.value || '')})`;
    }
    case 'id':
      return `${page}locator(${q('#' + (c.args.value || ''))})`;
    case 'name':
      return `${page}locator(${q(`[name=${JSON.stringify(c.args.value || '')}]`)})`;
    case 'css':
    case 'xpath':
    case 'xpathAbs':
    case 'xpathPos':
    case 'axis-ancestor':
    case 'axis-following':
    case 'axis-preceding':
    case 'axis-followingSibling':
    case 'axis-precedingSibling':
    case 'axis-parent':
      return `${page}locator(${q(c.cssOrXPath || '')})`;
    case 'chained': {
      const anchor = c.args.anchor || '';
      const m = lang === 'Python' ? 'get_by_label' : 'getByLabel';
      const labelArg = c.args.label || '';
      if (labelArg) return `${page}locator(${q(anchor)}).${m}(${q(labelArg)})`;
      return `${page}locator(${q(anchor)}).locator(${q(c.args.descendant || '')})`;
    }
    case 'smart-placeholder':
    case 'smart-name':
    case 'smart-id':
    case 'smart-label':
      return formatSmart(c, lang, page, q);
    case 'rel-above':
    case 'rel-below':
    case 'rel-near':
    case 'rel-toLeftOf':
    case 'rel-toRightOf':
      return ''; // unreachable: formatBare early-returns relative kinds
  }
}

function formatSmart(
  c: Candidate,
  lang: Lang,
  page: string,
  q: (s: string) => string,
): string {
  const tpl = c.template || {};
  const isExample = c.args.variant === 'example';

  if (lang === 'TypeScript' || lang === 'JavaScript') {
    const v = isExample ? c.args.value || '' : `\${${c.args.paramName || 'value'}}`;
    const xpathBody = (() => {
      if (c.kind === 'smart-placeholder') return `//${tpl.tag || 'input'}[@placeholder='${v}']`;
      if (c.kind === 'smart-name') return `//${tpl.tag || 'input'}[@name='${v}']`;
      if (c.kind === 'smart-id') return `//${tpl.tag || '*'}[@id='${v}']`;
      return `//label[normalize-space(.)='${v}']/following::input[1]`;
    })();
    return `${page}locator(\`${xpathBody}\`)`;
  }
  if (lang === 'Python') {
    const val = isExample ? (c.args.value || '') : `{${c.args.paramName || 'value'}}`;
    const xpathBody = (() => {
      if (c.kind === 'smart-placeholder') return `//${tpl.tag || 'input'}[@placeholder='${val}']`;
      if (c.kind === 'smart-name') return `//${tpl.tag || 'input'}[@name='${val}']`;
      if (c.kind === 'smart-id') return `//${tpl.tag || '*'}[@id='${val}']`;
      return `//label[normalize-space(.)='${val}']/following::input[1]`;
    })();
    if (isExample) return `${page}locator(${q(xpathBody)})`;
    return `${page}locator(f${q(xpathBody)})`;
  }
  if (lang === 'Java') {
    const val = isExample ? c.args.value || '' : '\\" + ' + (c.args.paramName || 'value') + ' + \\"';
    const xpathBody = (() => {
      if (c.kind === 'smart-placeholder') return `//${tpl.tag || 'input'}[@placeholder='${val}']`;
      if (c.kind === 'smart-name') return `//${tpl.tag || 'input'}[@name='${val}']`;
      if (c.kind === 'smart-id') return `//${tpl.tag || '*'}[@id='${val}']`;
      return `//label[normalize-space(.)='${val}']/following::input[1]`;
    })();
    return `${page}locator(${q(xpathBody)})`;
  }
  return `${page}locator(${q('')})`;
}

function formatSelenium(c: Candidate, lang: Lang): string {
  const q = (s: string) => quote(s, lang);
  const driver = lang === 'Java' ? 'driver.findElement' : 'driver.find_element';

  function by(strategy: string, value: string): string {
    if (lang === 'Java') {
      return `${driver}(By.${strategy}(${q(value)}))`;
    }
    const py: Record<string, string> = {
      id: 'By.ID',
      name: 'By.NAME',
      cssSelector: 'By.CSS_SELECTOR',
      xpath: 'By.XPATH',
      tagName: 'By.TAG_NAME',
      linkText: 'By.LINK_TEXT',
    };
    return `${driver}(${py[strategy] || 'By.CSS_SELECTOR'}, ${q(value)})`;
  }

  switch (c.kind) {
    case 'id':
      return by('id', c.args.value || '');
    case 'name':
      return by('name', c.args.value || '');
    case 'testid':
      return by('cssSelector', `[data-testid=${JSON.stringify(c.args.value || '')}]`);
    case 'role': {
      const role = c.args.role || '';
      const name = c.args.name || '';
      if (name) return by('xpath', `//*[@role='${role}' or self::${roleTagFor(role)}][normalize-space()=${JSON.stringify(name)}]`);
      return by('xpath', `//*[@role='${role}' or self::${roleTagFor(role)}]`);
    }
    case 'label':
      return by('xpath', `//label[normalize-space(.)=${JSON.stringify(c.args.value || '')}]/following::*[self::input or self::textarea or self::select][1]`);
    case 'placeholder':
      return by('cssSelector', `[placeholder=${JSON.stringify(c.args.value || '')}]`);
    case 'altText':
      return by('cssSelector', `[alt=${JSON.stringify(c.args.value || '')}]`);
    case 'title':
      return by('cssSelector', `[title=${JSON.stringify(c.args.value || '')}]`);
    case 'text':
      return by('xpath', `//*[normalize-space(.)=${JSON.stringify(c.args.value || '')}]`);
    case 'css':
      return by('cssSelector', c.cssOrXPath || '');
    case 'xpath':
    case 'xpathAbs':
    case 'xpathPos':
    case 'axis-ancestor':
    case 'axis-following':
    case 'axis-preceding':
    case 'axis-followingSibling':
    case 'axis-precedingSibling':
    case 'axis-parent':
      return by('xpath', c.cssOrXPath || '');
    case 'chained':
      return by('cssSelector', `${c.args.anchor || ''} ${c.args.descendant || ''}`.trim());
    case 'smart-placeholder':
    case 'smart-name':
    case 'smart-id':
    case 'smart-label':
      return formatSeleniumSmart(c, lang, by);
    case 'rel-above':
    case 'rel-below':
    case 'rel-near':
    case 'rel-toLeftOf':
    case 'rel-toRightOf':
      return ''; // unreachable: formatBare early-returns relative kinds
  }
}

function formatSeleniumRelative(c: Candidate, lang: Lang): string {
  const tag = c.args.tag || 'div';
  const anchor = c.args.anchor || '';
  const anchorKind = c.args.anchorKind === 'xpath' ? 'xpath' : 'css';
  const verb = relativeVerb(c.kind);
  if (lang === 'Java') {
    const tagExpr = `By.tagName(${quoteJava(tag)})`;
    const anchorByExpr = anchorKind === 'xpath'
      ? `By.xpath(${quoteJava(anchor)})`
      : `By.cssSelector(${quoteJava(anchor)})`;
    return `driver.findElement(with(${tagExpr}).${verb}(driver.findElement(${anchorByExpr})))`;
  }
  // Python
  const pyAnchorKey = anchorKind === 'xpath' ? '"xpath"' : '"css selector"';
  return `driver.find_element(locate_with(By.TAG_NAME, ${quotePython(tag)}).${verb}({${pyAnchorKey}: ${quotePython(anchor)}}))`;
}

function relativeVerb(kind: string): string {
  switch (kind) {
    case 'rel-above': return 'above';
    case 'rel-below': return 'below';
    case 'rel-near': return 'near';
    case 'rel-toLeftOf': return 'toLeftOf';
    case 'rel-toRightOf': return 'toRightOf';
    default: return 'near';
  }
}

function relativeXPathFallback(c: Candidate): string {
  const tag = c.args.tag || '*';
  const anchor = c.args.anchor || '';
  const anchorKind = c.args.anchorKind === 'xpath' ? 'xpath' : 'css';
  const kindStr: string = c.kind;
  const axis = kindStr === 'rel-toRightOf' || kindStr === 'rel-below' ? 'following'
    : kindStr === 'rel-toLeftOf' || kindStr === 'rel-above' ? 'preceding'
    : 'following';
  if (anchorKind === 'xpath') {
    return `xpath=${anchor}/${axis}::${tag}[1]`;
  }
  // CSS anchor — emit a Playwright-style xpath that references the anchor via
  // structural xpath when possible (best-effort for common label[for=...] case).
  const m = /^label\[for=("|')(.*)\1\]$/.exec(anchor);
  if (m) {
    return `xpath=//${tag}[${axis}::label[@for=${JSON.stringify(m[2])}]]`;
  }
  return `xpath=//${tag}[${axis}::*[self::label or self::h1 or self::h2 or self::h3 or self::legend][1]]`;
}

function formatSeleniumSmart(
  c: Candidate,
  lang: Lang,
  by: (s: string, v: string) => string,
): string {
  const isExample = c.args.variant === 'example';
  const tag = c.template?.tag || 'input';
  const v = isExample ? c.args.value || '' : (lang === 'Python' ? `{${c.args.paramName}}` : `" + ${c.args.paramName} + "`);

  let xpath: string;
  if (c.kind === 'smart-placeholder') xpath = `//${tag}[@placeholder='${v}']`;
  else if (c.kind === 'smart-name') xpath = `//${tag}[@name='${v}']`;
  else if (c.kind === 'smart-id') xpath = `//*[@id='${v}']`;
  else xpath = `//label[normalize-space(.)='${v}']/following::input[1]`;

  return by('xpath', xpath);
}

function roleTagFor(role: string): string {
  const map: Record<string, string> = {
    button: 'button',
    link: 'a',
    textbox: 'input',
    checkbox: 'input',
    radio: 'input',
    img: 'img',
    heading: 'h1',
  };
  return map[role] || '*';
}

function formatCypress(c: Candidate): string {
  switch (c.kind) {
    case 'role':
      return `cy.findByRole(${quoteJS(c.args.role || '')}${c.args.name ? `, { name: ${quoteJS(c.args.name)} }` : ''})`;
    case 'text':
      return `cy.contains(${quoteJS(c.args.value || '')})`;
    case 'label':
      return `cy.findByLabelText(${quoteJS(c.args.value || '')})`;
    case 'placeholder':
      return `cy.findByPlaceholderText(${quoteJS(c.args.value || '')})`;
    case 'altText':
      return `cy.findByAltText(${quoteJS(c.args.value || '')})`;
    case 'title':
      return `cy.findByTitle(${quoteJS(c.args.value || '')})`;
    case 'testid':
      return `cy.get(${quoteJS(`[data-testid=${JSON.stringify(c.args.value || '')}]`)})`;
    case 'id':
      return `cy.get(${quoteJS(`#${c.args.value || ''}`)})`;
    case 'name':
      return `cy.get(${quoteJS(`[name=${JSON.stringify(c.args.value || '')}]`)})`;
    case 'css':
      return `cy.get(${quoteJS(c.cssOrXPath || '')})`;
    case 'xpath':
    case 'xpathAbs':
    case 'xpathPos':
    case 'axis-ancestor':
    case 'axis-following':
    case 'axis-preceding':
    case 'axis-followingSibling':
    case 'axis-precedingSibling':
    case 'axis-parent':
      return `cy.xpath(${quoteJS(c.cssOrXPath || '')})`;
    case 'chained':
      return `cy.get(${quoteJS(c.args.anchor || '')}).find(${quoteJS(c.args.descendant || '')})`;
    case 'smart-placeholder':
      return formatCypressSmart('placeholder', c);
    case 'smart-name':
      return formatCypressSmart('name', c);
    case 'smart-id':
      return formatCypressSmart('id', c);
    case 'smart-label':
      return formatCypressSmart('label', c);
    case 'rel-above':
    case 'rel-below':
    case 'rel-near':
    case 'rel-toLeftOf':
    case 'rel-toRightOf':
      return ''; // unreachable: formatBare early-returns relative kinds
  }
}

function formatCypressSmart(kind: 'placeholder' | 'name' | 'id' | 'label', c: Candidate): string {
  const isExample = c.args.variant === 'example';
  const v = isExample ? c.args.value || '' : `\${${c.args.paramName || 'value'}}`;
  if (kind === 'id') return `cy.get(\`#${v}\`)`;
  if (kind === 'placeholder') return `cy.get(\`[placeholder="${v}"]\`)`;
  if (kind === 'name') return `cy.get(\`[name="${v}"]\`)`;
  return `cy.contains('label', \`${v}\`).siblings('input, textarea, select').first()`;
}

function formatWdio(c: Candidate): string {
  switch (c.kind) {
    case 'role':
      return `await $(${quoteJS(`[role=${JSON.stringify(c.args.role || '')}]`)})`;
    case 'text':
      return `await $(${quoteJS('=' + (c.args.value || ''))})`;
    case 'label':
      return `await $(${quoteJS(`//label[normalize-space(.)=${JSON.stringify(c.args.value || '')}]/following::input[1]`)})`;
    case 'placeholder':
      return `await $(${quoteJS(`[placeholder=${JSON.stringify(c.args.value || '')}]`)})`;
    case 'altText':
      return `await $(${quoteJS(`[alt=${JSON.stringify(c.args.value || '')}]`)})`;
    case 'title':
      return `await $(${quoteJS(`[title=${JSON.stringify(c.args.value || '')}]`)})`;
    case 'testid':
      return `await $(${quoteJS(`[data-testid=${JSON.stringify(c.args.value || '')}]`)})`;
    case 'id':
      return `await $(${quoteJS('#' + (c.args.value || ''))})`;
    case 'name':
      return `await $(${quoteJS(`[name=${JSON.stringify(c.args.value || '')}]`)})`;
    case 'css':
      return `await $(${quoteJS(c.cssOrXPath || '')})`;
    case 'xpath':
    case 'xpathAbs':
    case 'xpathPos':
    case 'axis-ancestor':
    case 'axis-following':
    case 'axis-preceding':
    case 'axis-followingSibling':
    case 'axis-precedingSibling':
    case 'axis-parent':
      return `await $(${quoteJS(c.cssOrXPath || '')})`;
    case 'chained':
      return `await $(${quoteJS(c.args.anchor || '')}).$(${quoteJS(c.args.descendant || '')})`;
    case 'smart-placeholder':
    case 'smart-name':
    case 'smart-id':
    case 'smart-label': {
      const isExample = c.args.variant === 'example';
      const v = isExample ? c.args.value || '' : `\${${c.args.paramName || 'value'}}`;
      const tag = c.template?.tag || 'input';
      let xp: string;
      if (c.kind === 'smart-placeholder') xp = `//${tag}[@placeholder='${v}']`;
      else if (c.kind === 'smart-name') xp = `//${tag}[@name='${v}']`;
      else if (c.kind === 'smart-id') xp = `//*[@id='${v}']`;
      else xp = `//label[normalize-space(.)='${v}']/following::input[1]`;
      return `await $(\`${xp}\`)`;
    }
    case 'rel-above':
    case 'rel-below':
    case 'rel-near':
    case 'rel-toLeftOf':
    case 'rel-toRightOf':
      return ''; // unreachable: formatBare early-returns relative kinds
  }
}

function formatRobot(c: Candidate): string {
  switch (c.kind) {
    case 'id':
      return `id:${c.args.value || ''}`;
    case 'name':
      return `name:${c.args.value || ''}`;
    case 'testid':
      return `css:[data-testid="${c.args.value || ''}"]`;
    case 'placeholder':
      return `css:[placeholder="${c.args.value || ''}"]`;
    case 'altText':
      return `css:[alt="${c.args.value || ''}"]`;
    case 'title':
      return `css:[title="${c.args.value || ''}"]`;
    case 'text':
      return `xpath://*[normalize-space(.)="${c.args.value || ''}"]`;
    case 'label':
      return `xpath://label[normalize-space(.)="${c.args.value || ''}"]/following::input[1]`;
    case 'role':
      return `css:[role="${c.args.role || ''}"]`;
    case 'css':
      return `css:${c.cssOrXPath || ''}`;
    case 'xpath':
    case 'xpathAbs':
    case 'xpathPos':
    case 'axis-ancestor':
    case 'axis-following':
    case 'axis-preceding':
    case 'axis-followingSibling':
    case 'axis-precedingSibling':
    case 'axis-parent':
      return `xpath:${c.cssOrXPath || ''}`;
    case 'chained':
      return `css:${c.args.anchor || ''} ${c.args.descendant || ''}`;
    case 'smart-placeholder':
    case 'smart-name':
    case 'smart-id':
    case 'smart-label': {
      const isExample = c.args.variant === 'example';
      const v = isExample ? c.args.value || '' : `\${${c.args.paramName || 'value'}}`;
      if (c.kind === 'smart-id') return `id:${v}`;
      if (c.kind === 'smart-placeholder') return `css:[placeholder="${v}"]`;
      if (c.kind === 'smart-name') return `css:[name="${v}"]`;
      return `xpath://label[normalize-space(.)="${v}"]/following::input[1]`;
    }
    case 'rel-above':
    case 'rel-below':
    case 'rel-near':
    case 'rel-toLeftOf':
    case 'rel-toRightOf':
      return ''; // unreachable: formatBare early-returns relative kinds
  }
}

export function formatVariableName(c: Candidate): string {
  const seed = c.args.value || c.args.role || c.cssOrXPath || c.kind;
  const cleaned = seed
    .replace(/[^A-Za-z0-9 ]+/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join('');
  return cleaned || 'el';
}

export function formatWithVariable(c: Candidate, ctx: FormatContext): string {
  const expr = formatExpression(c, ctx);
  const name = ctx.variableName || formatVariableName(c);
  const fam = ctx.framework.family;
  const lang = ctx.framework.language;
  if (fam === 'playwright') {
    if (lang === 'TypeScript') return `const ${name}: Locator = ${expr};`;
    if (lang === 'JavaScript') return `const ${name} = ${expr};`;
    if (lang === 'Python') return `${snake(name)} = ${expr}`;
    if (lang === 'Java') return `Locator ${name} = ${expr};`;
  }
  if (fam === 'selenium') {
    if (lang === 'Java') return `WebElement ${name} = ${expr};`;
    if (lang === 'Python') return `${snake(name)} = ${expr}`;
  }
  if (fam === 'cypress') return `const ${name} = ${expr};`;
  if (fam === 'webdriverio') return `const ${name} = ${expr};`;
  if (fam === 'robot') return `\${${name.toUpperCase()}}=    ${expr}`;
  return expr;
}

export function formatFullStatement(c: Candidate, ctx: FormatContext): string {
  const expr = formatExpression(c, ctx);
  const fam = ctx.framework.family;
  const lang = ctx.framework.language;
  if (fam === 'playwright') {
    if (lang === 'TypeScript' || lang === 'JavaScript') return `await ${expr}.click();`;
    if (lang === 'Python') return `${expr}.click()`;
    if (lang === 'Java') return `${expr}.click();`;
  }
  if (fam === 'selenium') {
    if (lang === 'Java') return `${expr}.click();`;
    if (lang === 'Python') return `${expr}.click()`;
  }
  if (fam === 'cypress') return `${expr}.click();`;
  if (fam === 'webdriverio') return `${expr}.click();`;
  if (fam === 'robot') return `Click Element    ${expr}`;
  return expr;
}

function snake(s: string): string {
  return s.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}
