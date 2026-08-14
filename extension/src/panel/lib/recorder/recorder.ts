import type { Candidate, FrameworkDef, FormatContext, GenerateOptions } from '../locators/types';
import { generateCandidates, sortCandidates } from '../locators/generate';
import { formatExpression } from '../locators/format';
import { quoteJS, quotePython, quoteJava } from '../utils/escape';
import type { RecordedStep } from './types';

/**
 * Pick the best locator candidate from a SerializedElement for a recorded step.
 * Falls back to a CSS-path candidate if no candidates were generated.
 */
function bestCandidate(step: RecordedStep, opts: GenerateOptions): Candidate {
  const all = generateCandidates(step.element, opts);
  const sorted = sortCandidates(all);
  if (sorted.length) return sorted[0];
  // Fallback if nothing usable was produced
  return {
    kind: 'css',
    rank: 100,
    args: {},
    cssOrXPath: step.element.cssPath || step.element.tag,
    matchCount: 0,
    isUnique: false,
    stability: 'fragile',
    section: 'fallback',
    description: 'Fallback CSS path',
  };
}

type Lang = FrameworkDef['language'];

function quoteFor(s: string, lang: Lang): string {
  if (lang === 'TypeScript' || lang === 'JavaScript') return quoteJS(s);
  if (lang === 'Python') return quotePython(s);
  if (lang === 'Java') return quoteJava(s);
  return JSON.stringify(s);
}

/**
 * Apply an action to a locator expression and produce a complete test
 * statement for the given framework + language.
 */
function applyAction(expr: string, step: RecordedStep, framework: FrameworkDef): string {
  const lang = framework.language;
  const family = framework.family;
  const v = step.value ?? '';
  const q = (s: string) => quoteFor(s, lang);

  if (family === 'playwright') {
    if (lang === 'TypeScript' || lang === 'JavaScript') {
      switch (step.action) {
        case 'click': return `await ${expr}.click();`;
        case 'dblclick': return `await ${expr}.dblclick();`;
        case 'fill': return `await ${expr}.fill(${q(v)});`;
        case 'select': return `await ${expr}.selectOption(${q(v)});`;
        case 'press': return `await ${expr}.press(${q(v)});`;
      }
    }
    if (lang === 'Python') {
      switch (step.action) {
        case 'click': return `${expr}.click()`;
        case 'dblclick': return `${expr}.dblclick()`;
        case 'fill': return `${expr}.fill(${q(v)})`;
        case 'select': return `${expr}.select_option(${q(v)})`;
        case 'press': return `${expr}.press(${q(v)})`;
      }
    }
    if (lang === 'Java') {
      switch (step.action) {
        case 'click': return `${expr}.click();`;
        case 'dblclick': return `${expr}.dblclick();`;
        case 'fill': return `${expr}.fill(${q(v)});`;
        case 'select': return `${expr}.selectOption(${q(v)});`;
        case 'press': return `${expr}.press(${q(v)});`;
      }
    }
  }

  if (family === 'selenium') {
    if (lang === 'Java') {
      switch (step.action) {
        case 'click': return `${expr}.click();`;
        case 'dblclick': return `new Actions(driver).doubleClick(${expr}).perform();`;
        case 'fill': return `${expr}.clear();\n${expr}.sendKeys(${q(v)});`;
        case 'select': return `new Select(${expr}).selectByVisibleText(${q(v)});`;
        case 'press': return `${expr}.sendKeys(Keys.${seleniumJavaKey(v)});`;
      }
    }
    if (lang === 'Python') {
      switch (step.action) {
        case 'click': return `${expr}.click()`;
        case 'dblclick': return `ActionChains(driver).double_click(${expr}).perform()`;
        case 'fill': return `${expr}.clear()\n${expr}.send_keys(${q(v)})`;
        case 'select': return `Select(${expr}).select_by_visible_text(${q(v)})`;
        case 'press': return `${expr}.send_keys(Keys.${seleniumPyKey(v)})`;
      }
    }
  }

  if (family === 'cypress') {
    switch (step.action) {
      case 'click': return `${expr}.click();`;
      case 'dblclick': return `${expr}.dblclick();`;
      case 'fill': return `${expr}.clear().type(${q(v)});`;
      case 'select': return `${expr}.select(${q(v)});`;
      case 'press': return `${expr}.type(${q('{' + v.toLowerCase() + '}')});`;
    }
  }

  if (family === 'webdriverio') {
    switch (step.action) {
      case 'click': return `await ${expr}.click();`;
      case 'dblclick': return `await ${expr}.doubleClick();`;
      case 'fill': return `await ${expr}.setValue(${q(v)});`;
      case 'select': return `await ${expr}.selectByVisibleText(${q(v)});`;
      case 'press': return `await browser.keys(${q(v)});`;
    }
  }

  if (family === 'robot') {
    switch (step.action) {
      case 'click': return `Click Element    ${expr}`;
      case 'dblclick': return `Double Click Element    ${expr}`;
      case 'fill': return `Input Text    ${expr}    ${v}`;
      case 'select': return `Select From List By Label    ${expr}    ${v}`;
      case 'press': return `Press Keys    ${expr}    ${v}`;
    }
  }

  return expr;
}

function seleniumJavaKey(k: string): string {
  const map: Record<string, string> = {
    Enter: 'ENTER',
    Tab: 'TAB',
    Escape: 'ESCAPE',
    Backspace: 'BACK_SPACE',
    ArrowUp: 'ARROW_UP',
    ArrowDown: 'ARROW_DOWN',
    ArrowLeft: 'ARROW_LEFT',
    ArrowRight: 'ARROW_RIGHT',
    ' ': 'SPACE',
  };
  return map[k] || k.toUpperCase();
}

function seleniumPyKey(k: string): string {
  const map: Record<string, string> = {
    Enter: 'ENTER',
    Tab: 'TAB',
    Escape: 'ESCAPE',
    Backspace: 'BACK_SPACE',
    ArrowUp: 'ARROW_UP',
    ArrowDown: 'ARROW_DOWN',
    ArrowLeft: 'ARROW_LEFT',
    ArrowRight: 'ARROW_RIGHT',
    ' ': 'SPACE',
  };
  return map[k] || k.toUpperCase();
}

export interface EmittedStep {
  step: RecordedStep;
  candidate: Candidate;
  /** Just the locator expression — e.g. `page.getByRole('button', { name: 'Submit' })`. */
  locatorExpression: string;
  /** The full action line — e.g. `await page.getByRole(...).click();`. */
  statement: string;
}

export function emitStep(
  step: RecordedStep,
  framework: FrameworkDef,
  testIdAttribute: string,
): EmittedStep {
  const opts: GenerateOptions = {
    testIdAttribute,
    showSmartPatterns: false,
    selfHealing: false,
    showAxes: false,
  };
  const candidate = bestCandidate(step, opts);
  const ctx: FormatContext = { framework, withHealing: false };
  const expr = formatExpression(candidate, ctx);
  return {
    step,
    candidate,
    locatorExpression: expr,
    statement: applyAction(expr, step, framework),
  };
}

export function emitAll(
  steps: RecordedStep[],
  framework: FrameworkDef,
  testIdAttribute: string,
): EmittedStep[] {
  return steps.map((s) => emitStep(s, framework, testIdAttribute));
}

/**
 * Wrap the emitted statements in a minimal test-file skeleton for the
 * selected framework. Comments are intentionally light — this is a starter.
 */
export function buildTestFile(
  steps: RecordedStep[],
  framework: FrameworkDef,
  testIdAttribute: string,
  url?: string,
): string {
  const emitted = emitAll(steps, framework, testIdAttribute);
  const lines = emitted.map((e) => e.statement);
  const fam = framework.family;
  const lang = framework.language;
  const visit = url ? url : 'https://example.com';

  if (fam === 'playwright') {
    if (lang === 'TypeScript') {
      return [
        `import { test, expect } from '@playwright/test';`,
        ``,
        `test('recorded flow', async ({ page }) => {`,
        `  await page.goto(${quoteJS(visit)});`,
        ...lines.map((l) => '  ' + l),
        `});`,
      ].join('\n');
    }
    if (lang === 'JavaScript') {
      return [
        `const { test, expect } = require('@playwright/test');`,
        ``,
        `test('recorded flow', async ({ page }) => {`,
        `  await page.goto(${quoteJS(visit)});`,
        ...lines.map((l) => '  ' + l),
        `});`,
      ].join('\n');
    }
    if (lang === 'Python') {
      return [
        `from playwright.sync_api import sync_playwright`,
        ``,
        `def test_recorded_flow():`,
        `    with sync_playwright() as p:`,
        `        browser = p.chromium.launch()`,
        `        page = browser.new_page()`,
        `        page.goto(${quotePython(visit)})`,
        ...lines.map((l) => '        ' + l),
        `        browser.close()`,
      ].join('\n');
    }
    if (lang === 'Java') {
      return [
        `import com.microsoft.playwright.*;`,
        ``,
        `public class RecordedFlow {`,
        `  public static void main(String[] args) {`,
        `    try (Playwright playwright = Playwright.create()) {`,
        `      Browser browser = playwright.chromium().launch();`,
        `      Page page = browser.newPage();`,
        `      page.navigate(${quoteJava(visit)});`,
        ...lines.map((l) => '      ' + l),
        `      browser.close();`,
        `    }`,
        `  }`,
        `}`,
      ].join('\n');
    }
  }

  if (fam === 'selenium') {
    if (lang === 'Java') {
      return [
        `import org.openqa.selenium.*;`,
        `import org.openqa.selenium.chrome.ChromeDriver;`,
        `import org.openqa.selenium.interactions.Actions;`,
        `import org.openqa.selenium.support.ui.Select;`,
        ``,
        `public class RecordedFlow {`,
        `  public static void main(String[] args) {`,
        `    WebDriver driver = new ChromeDriver();`,
        `    driver.get(${quoteJava(visit)});`,
        ...lines.map((l) => '    ' + l),
        `    driver.quit();`,
        `  }`,
        `}`,
      ].join('\n');
    }
    if (lang === 'Python') {
      return [
        `from selenium import webdriver`,
        `from selenium.webdriver.common.by import By`,
        `from selenium.webdriver.common.keys import Keys`,
        `from selenium.webdriver.common.action_chains import ActionChains`,
        `from selenium.webdriver.support.ui import Select`,
        ``,
        `driver = webdriver.Chrome()`,
        `driver.get(${quotePython(visit)})`,
        ...lines,
        `driver.quit()`,
      ].join('\n');
    }
  }

  if (fam === 'cypress') {
    return [
      `describe('recorded flow', () => {`,
      `  it('replays steps', () => {`,
      `    cy.visit(${quoteJS(visit)});`,
      ...lines.map((l) => '    ' + l),
      `  });`,
      `});`,
    ].join('\n');
  }

  if (fam === 'webdriverio') {
    return [
      `describe('recorded flow', () => {`,
      `  it('replays steps', async () => {`,
      `    await browser.url(${quoteJS(visit)});`,
      ...lines.map((l) => '    ' + l),
      `  });`,
      `});`,
    ].join('\n');
  }

  if (fam === 'robot') {
    return [
      `*** Settings ***`,
      `Library    SeleniumLibrary`,
      ``,
      `*** Test Cases ***`,
      `Recorded Flow`,
      `    Open Browser    ${visit}    chrome`,
      ...lines.map((l) => '    ' + l),
      `    Close Browser`,
    ].join('\n');
  }

  return lines.join('\n');
}

/**
 * Pick a sensible filename for the downloaded test file based on language.
 */
export function defaultFilename(framework: FrameworkDef): string {
  const fam = framework.family;
  const lang = framework.language;
  if (fam === 'playwright') {
    if (lang === 'TypeScript') return 'recorded.spec.ts';
    if (lang === 'JavaScript') return 'recorded.spec.js';
    if (lang === 'Python') return 'test_recorded.py';
    if (lang === 'Java') return 'RecordedFlow.java';
  }
  if (fam === 'selenium') {
    if (lang === 'Java') return 'RecordedFlow.java';
    if (lang === 'Python') return 'test_recorded.py';
  }
  if (fam === 'cypress') return 'recorded.cy.js';
  if (fam === 'webdriverio') return 'recorded.wdio.js';
  if (fam === 'robot') return 'recorded.robot';
  return 'recorded.txt';
}
