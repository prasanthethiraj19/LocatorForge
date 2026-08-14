import type { PomConfig, PomItem } from './types';
import { formatExpression } from '../locators/format';
import { getFramework } from '../locators/frameworks';
import { dedupeFieldNames, pascal, snake } from './naming';

export function generatePom(items: PomItem[], cfg: PomConfig): string {
  const cloned = items.map((i) => ({ ...i }));
  dedupeFieldNames(cloned);
  const fw = getFramework(cfg.framework);

  switch (fw.family) {
    case 'playwright':
      if (fw.language === 'TypeScript') return playwrightTs(cloned, cfg);
      if (fw.language === 'JavaScript') return playwrightJs(cloned, cfg);
      if (fw.language === 'Python') return playwrightPy(cloned, cfg);
      if (fw.language === 'Java') return playwrightJava(cloned, cfg);
      return playwrightTs(cloned, cfg);
    case 'selenium':
      if (fw.language === 'Java') return seleniumJava(cloned, cfg);
      return seleniumPy(cloned, cfg);
    case 'cypress':
      return cypress(cloned, cfg);
    case 'webdriverio':
      return wdio(cloned, cfg);
    case 'robot':
      return robot(cloned, cfg);
  }
}

function exprFor(item: PomItem, frameworkId: PomConfig['framework'], pageVar: string): string {
  const expr = formatExpression(item.candidate, { framework: getFramework(frameworkId) });
  return expr.replace(/^page\./, pageVar + '.');
}

function playwrightTs(items: PomItem[], cfg: PomConfig): string {
  const fields = items
    .map((i) => `  readonly ${i.fieldName}: Locator;`)
    .join('\n');
  const init = items
    .map((i) => `    this.${i.fieldName} = ${exprFor(i, cfg.framework, 'page')};`)
    .join('\n');
  return `import { type Locator, type Page } from '@playwright/test';

export class ${pascal(cfg.className)} {
  readonly page: Page;
${fields}

  constructor(page: Page) {
    this.page = page;
${init}
  }

  async goto() {
    await this.page.goto(${JSON.stringify(cfg.url || '/')});
  }
}
`;
}

function playwrightJs(items: PomItem[], cfg: PomConfig): string {
  const init = items
    .map((i) => `    this.${i.fieldName} = ${exprFor(i, cfg.framework, 'page')};`)
    .join('\n');
  return `export class ${pascal(cfg.className)} {
  constructor(page) {
    this.page = page;
${init}
  }

  async goto() {
    await this.page.goto(${JSON.stringify(cfg.url || '/')});
  }
}
`;
}

function playwrightPy(items: PomItem[], cfg: PomConfig): string {
  const init = items
    .map((i) => `        self.${snake(i.fieldName)} = ${exprFor(i, cfg.framework, 'page')}`)
    .join('\n');
  return `from playwright.sync_api import Page, Locator


class ${pascal(cfg.className)}:
    def __init__(self, page: Page) -> None:
        self.page = page
${init}

    def goto(self) -> None:
        self.page.goto(${JSON.stringify(cfg.url || '/')})
`;
}

function playwrightJava(items: PomItem[], cfg: PomConfig): string {
  const fields = items.map((i) => `    public final Locator ${i.fieldName};`).join('\n');
  const init = items
    .map((i) => `        this.${i.fieldName} = ${exprFor(i, cfg.framework, 'page')};`)
    .join('\n');
  const pkg = cfg.packageName ? `package ${cfg.packageName};\n\n` : '';
  return `${pkg}import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;

public class ${pascal(cfg.className)} {
    private final Page page;
${fields}

    public ${pascal(cfg.className)}(Page page) {
        this.page = page;
${init}
    }

    public void goto_() {
        this.page.navigate(${JSON.stringify(cfg.url || '/')});
    }
}
`;
}

function seleniumJava(items: PomItem[], cfg: PomConfig): string {
  const fields = items.map((i) => `    private final WebElement ${i.fieldName};`).join('\n');
  const init = items
    .map((i) => `        this.${i.fieldName} = ${exprFor(i, cfg.framework, 'driver')};`)
    .join('\n');
  const pkg = cfg.packageName ? `package ${cfg.packageName};\n\n` : '';
  return `${pkg}import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;

public class ${pascal(cfg.className)} {
    private final WebDriver driver;
${fields}

    public ${pascal(cfg.className)}(WebDriver driver) {
        this.driver = driver;
${init}
    }

    public void open() {
        this.driver.get(${JSON.stringify(cfg.url || '/')});
    }
}
`;
}

function seleniumPy(items: PomItem[], cfg: PomConfig): string {
  const init = items
    .map((i) => `        self.${snake(i.fieldName)} = ${exprFor(i, cfg.framework, 'driver')}`)
    .join('\n');
  return `from selenium import webdriver
from selenium.webdriver.common.by import By


class ${pascal(cfg.className)}:
    def __init__(self, driver: webdriver.Remote) -> None:
        self.driver = driver
${init}

    def open(self) -> None:
        self.driver.get(${JSON.stringify(cfg.url || '/')})
`;
}

function cypress(items: PomItem[], cfg: PomConfig): string {
  const methods = items
    .map((i) => `  ${i.fieldName}() {\n    return ${exprFor(i, cfg.framework, 'cy')};\n  }`)
    .join('\n\n');
  return `export class ${pascal(cfg.className)} {
  visit() {
    cy.visit(${JSON.stringify(cfg.url || '/')});
    return this;
  }

${methods}
}
`;
}

function wdio(items: PomItem[], cfg: PomConfig): string {
  const methods = items
    .map(
      (i) =>
        `  get ${i.fieldName}() {\n    return ${exprFor(i, cfg.framework, 'browser')};\n  }`,
    )
    .join('\n\n');
  return `export class ${pascal(cfg.className)} {
  async open() {
    await browser.url(${JSON.stringify(cfg.url || '/')});
  }

${methods}
}
`;
}

function robot(items: PomItem[], cfg: PomConfig): string {
  const variables = items
    .map((i) => `\${${i.fieldName.toUpperCase()}}    ${exprFor(i, cfg.framework, '')}`)
    .join('\n');
  return `*** Settings ***
Documentation    ${pascal(cfg.className)} page object — generated by LocatorForge
Library          SeleniumLibrary

*** Variables ***
\${URL}    ${cfg.url || '/'}
${variables}

*** Keywords ***
Open ${pascal(cfg.className)}
    Open Browser    \${URL}    chrome
`;
}
