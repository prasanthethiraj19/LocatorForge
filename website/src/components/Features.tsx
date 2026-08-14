import {
  Code2,
  Target,
  Sparkles,
  FlaskConical,
  MousePointerClick,
  Layers,
  Zap,
  Chrome,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Code2,
    title: '9 frameworks, one dropdown',
    body: 'Playwright (TS/JS/Python/Java), Selenium (Java/Python), Cypress, WebdriverIO, Robot Framework. Same locator strategy, idiomatic syntax per stack.',
  },
  {
    icon: Target,
    title: 'Stability scoring',
    body: 'Every candidate rated best / good / ok / fragile. Sorted into Recommended, Smart Patterns, Alternative, Axes, Fallback. Strongest locator wins automatically.',
  },
  {
    icon: Sparkles,
    title: 'Smart patterns for forms',
    body: 'Inputs get parameterized templates with ${placeholder}, ${name}, ${id}, ${label} — drop them into Page Object methods.',
  },
  {
    icon: FlaskConical,
    title: 'Test Locator bar + Linter',
    body: 'Type any CSS or XPath, see live match count. Per-row warnings flag absolute xpath, nth-of-type, autogen CSS classes, ambiguous role names.',
  },
  {
    icon: MousePointerClick,
    title: 'Pick + highlight on page',
    body: 'Click element with hover overlay. Or hover any locator row → matching elements flash green on the page with auto-scroll.',
  },
  {
    icon: Layers,
    title: 'Shadow DOM + iframe support',
    body: 'Auto-detects shadow root boundaries and iframes. Emits chained selectors and frameLocator() wrappers across all 9 frameworks.',
  },
  {
    icon: Zap,
    title: 'Self-healing chains + XPath axes',
    body: 'Playwright .or() fallback chains. Relative xpath axes (ancestor / following / preceding / sibling) for power use cases.',
  },
  {
    icon: Chrome,
    title: 'Page Object generator',
    body: 'Add elements with +, generate full Page Object class file in your framework. Copy or download as .ts/.py/.java/.robot.',
  },
];

export function Features() {
  return (
    <section id="features" className="py-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Everything testers need.</h2>
          <p className="text-slate-600 dark:text-slate-400 mt-3 max-w-2xl mx-auto">
            One panel. Every framework. Ranked by stability. Verified live against the page.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="card hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
              <f.icon className="w-6 h-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-base mb-2">{f.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
