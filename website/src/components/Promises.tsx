import { Zap, Shield, Gift } from 'lucide-react';

const ITEMS = [
  {
    icon: Zap,
    n: '01',
    title: 'Instant',
    body: 'Locators populate the moment you click an element. Zero hunting through 12 DevTools tabs.',
  },
  {
    icon: Shield,
    n: '02',
    title: 'No tracking',
    body: 'Zero telemetry. Zero analytics. Zero remote calls. All settings live in your browser.',
  },
  {
    icon: Gift,
    n: '03',
    title: 'Completely free',
    body: 'No premium tier, no ads, no signup, no paywalled features. Every framework and strategy is included, free.',
  },
];

export function Promises() {
  return (
    <section id="promises" className="border-y border-stone-200 bg-white">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-px overflow-hidden md:grid-cols-3">
        {ITEMS.map((it) => (
          <div key={it.title} className="group flex gap-4 bg-white px-8 py-9 md:border-l md:first:border-l-0 md:border-stone-200">
            <div className="flex-shrink-0">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-ember-500 to-ember-700 text-white shadow-sm transition-transform group-hover:-translate-y-0.5">
                <it.icon className="h-5 w-5" />
              </div>
            </div>
            <div>
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">
                No.{it.n}
              </div>
              <h3 className="mt-1 font-bold text-stone-900">{it.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-600">{it.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
