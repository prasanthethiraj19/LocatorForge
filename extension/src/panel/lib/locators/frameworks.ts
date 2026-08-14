import type { FrameworkDef, FrameworkId } from './types';

export const FRAMEWORKS: FrameworkDef[] = [
  { id: 'playwright-ts', family: 'playwright', label: 'Playwright · TypeScript', shortLabel: 'PW · TS', language: 'TypeScript' },
  { id: 'playwright-js', family: 'playwright', label: 'Playwright · JavaScript', shortLabel: 'PW · JS', language: 'JavaScript' },
  { id: 'playwright-py', family: 'playwright', label: 'Playwright · Python', shortLabel: 'PW · Py', language: 'Python' },
  { id: 'playwright-java', family: 'playwright', label: 'Playwright · Java', shortLabel: 'PW · Java', language: 'Java' },
  { id: 'selenium-java', family: 'selenium', label: 'Selenium · Java', shortLabel: 'Se · Java', language: 'Java' },
  { id: 'selenium-py', family: 'selenium', label: 'Selenium · Python', shortLabel: 'Se · Py', language: 'Python' },
  { id: 'cypress', family: 'cypress', label: 'Cypress · JS/TS', shortLabel: 'Cypress', language: 'JavaScript' },
  { id: 'webdriverio', family: 'webdriverio', label: 'WebdriverIO · JS/TS', shortLabel: 'WdIO', language: 'JavaScript' },
  { id: 'robot', family: 'robot', label: 'Robot Framework', shortLabel: 'Robot', language: 'Robot' },
];

export const DEFAULT_FRAMEWORK: FrameworkId = 'playwright-ts';

export function getFramework(id: FrameworkId): FrameworkDef {
  return FRAMEWORKS.find((f) => f.id === id) || FRAMEWORKS[0];
}
