import { MousePointerClick, Sparkles, Copy } from 'lucide-react';

const STEPS = [
  {
    n: '01',
    icon: MousePointerClick,
    title: 'Pick an element',
    body: 'Click any element in DevTools, or use the Pick button to grab one with hover-overlay on the page.',
  },
  {
    n: '02',
    icon: Sparkles,
    title: 'Get locators ranked',
    body: 'LocatorForge emits every strategy — role, testid, label, css, xpath, chained — sorted by stability and uniqueness.',
  },
  {
    n: '03',
    icon: Copy,
    title: 'Copy. Paste. Test.',
    body: 'One-click copy in your framework syntax. Or stack elements into the basket and generate a full Page Object class.',
  },
];

export function HowItWorks() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-12 text-center">
          <p className="kicker">Workflow</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-stone-900 md:text-4xl">
            Three steps. That's it.
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="group relative rounded-2xl border border-stone-200 bg-white p-7 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-panel">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-forge-950 text-ember-400 transition-colors group-hover:bg-ember-600 group-hover:text-white">
                  <s.icon className="h-5 w-5" />
                </div>
                <span className="font-mono text-4xl font-extrabold tracking-tighter text-stone-100">
                  {s.n}
                </span>
              </div>
              <h3 className="font-bold text-stone-900">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
