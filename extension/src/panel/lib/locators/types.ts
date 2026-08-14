export type Stability = 'best' | 'good' | 'ok' | 'fragile';

export type Section = 'recommended' | 'smart' | 'alternative' | 'fallback' | 'axes' | 'relative';

export type Mode = 'inspect' | 'pick';

/**
 * Selenium 4 relative locator kinds. Subset alias used by relative.ts.
 */
export type RelativeLocatorKind =
  | 'rel-above'
  | 'rel-below'
  | 'rel-near'
  | 'rel-toLeftOf'
  | 'rel-toRightOf';

/**
 * Every locator kind that can appear on a Candidate. All consumers that
 * pattern-match on `kind` must handle the full union.
 */
export type LocatorKind =
  | 'role'
  | 'text'
  | 'label'
  | 'placeholder'
  | 'altText'
  | 'title'
  | 'testid'
  | 'id'
  | 'name'
  | 'css'
  | 'xpath'
  | 'xpathAbs'
  | 'xpathPos'
  | 'chained'
  | 'smart-placeholder'
  | 'smart-name'
  | 'smart-id'
  | 'smart-label'
  | 'axis-ancestor'
  | 'axis-following'
  | 'axis-preceding'
  | 'axis-followingSibling'
  | 'axis-precedingSibling'
  | 'axis-parent'
  | RelativeLocatorKind;

/** @deprecated alias retained for back-compat; same as LocatorKind. */
export type AnyLocatorKind = LocatorKind;

export type FrameworkId =
  | 'playwright-ts'
  | 'playwright-js'
  | 'playwright-py'
  | 'playwright-java'
  | 'selenium-java'
  | 'selenium-py'
  | 'cypress'
  | 'webdriverio'
  | 'robot';

export type FrameworkFamily = 'playwright' | 'selenium' | 'cypress' | 'webdriverio' | 'robot';

export interface FrameworkDef {
  id: FrameworkId;
  family: FrameworkFamily;
  label: string;
  shortLabel: string;
  language: 'TypeScript' | 'JavaScript' | 'Python' | 'Java' | 'Robot';
}

export type LintSeverity = 'warn' | 'info';

export interface LintFinding {
  rule: string;
  severity: LintSeverity;
  message: string;
}

export interface Candidate {
  kind: LocatorKind;
  rank: number;
  matchCount: number;
  isUnique: boolean;
  stability: Stability;
  section: Section;
  args: Record<string, string | undefined>;
  cssOrXPath?: string;
  template?: Record<string, string | undefined>;
  description?: string;
  rationale?: string;
  lints?: LintFinding[];
  shadowChain?: string[];
  frameChain?: string[];
  healingFallbacks?: Candidate[];
}

export interface RelativeAnchor {
  kind: RelativeLocatorKind;
  selector: string;
  selectorKind: 'css' | 'xpath';
  label?: string;
  tag: string;
}

export interface SerializedElement {
  tag: string;
  attrs: Record<string, string>;
  textContent: string;
  visibleText: string;
  alt: string;
  title: string;
  placeholder: string;
  ariaLabel: string;
  ariaLabelledByText: string;
  labelText: string;
  role: string;
  testIds: Record<string, string>;
  cssPath: string;
  xpath: string;
  xpathAbsolute: string;
  xpathPosition: string;
  ancestorAnchor: { selector: string; chain: string } | null;
  shadowChain: string[];
  frameChain: string[];
  isSvg: boolean;
  inShadowRoot: boolean;
  inIframe: boolean;
}

export interface GenerateOptions {
  testIdAttribute: string;
  showSmartPatterns: boolean;
  selfHealing: boolean;
  showAxes: boolean;
}

export interface FormatContext {
  framework: FrameworkDef;
  variableName?: string;
  asFullStatement?: boolean;
  withFrameLocator?: boolean;
  withHealing?: boolean;
}
