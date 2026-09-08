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
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 max-w-2xl">
          <p className="kicker">Everything testers need</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-stone-900 md:text-4xl">
            One panel. Every framework.
          </h2>
          <p className="mt-3 text-stone-600">
            Ranked by stability. Verified live against the page you're inspecting.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-stone-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-ember-300 hover:shadow-panel"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-ember-50 text-ember-600 ring-1 ring-ember-100 transition-colors group-hover:bg-ember-600 group-hover:text-white">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-stone-900">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
