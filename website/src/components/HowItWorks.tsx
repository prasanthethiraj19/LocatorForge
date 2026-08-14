import { MousePointerClick, Sparkles, Copy } from 'lucide-react';

const STEPS = [
  {
    n: 1,
    icon: MousePointerClick,
    title: 'Pick an element',
    body: 'Click any element in DevTools, or use the Pick button to grab one with hover-overlay on the page.',
  },
  {
    n: 2,
    icon: Sparkles,
    title: 'Get locators ranked',
    body: 'LocatorForge emits every strategy — role, testid, label, css, xpath, chained — sorted by stability and uniqueness.',
  },
  {
    n: 3,
    icon: Copy,
    title: 'Copy. Paste. Test.',
    body: 'One-click copy in your framework syntax. Or stack elements into the basket and generate a full Page Object class.',
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 bg-slate-50 dark:bg-zinc-900/50 border-y border-slate-100 dark:border-zinc-900">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Three steps. That's it.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((s) => (
            <div key={s.n} className="card text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-emerald-600 text-white inline-flex items-center justify-center mb-4">
                <s.icon className="w-6 h-6" />
              </div>
              <div className="text-xs font-mono text-slate-400 mb-1">STEP {s.n}</div>
              <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
