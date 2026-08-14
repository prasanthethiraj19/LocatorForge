import { Zap, Shield, MinusCircle } from 'lucide-react';

const ITEMS = [
  {
    icon: Zap,
    title: 'Instant',
    body: 'Locators populate the moment you click an element. Zero hunting through 12 DevTools tabs.',
  },
  {
    icon: Shield,
    title: 'No tracking',
    body: 'Zero telemetry. Zero analytics. Zero remote calls. All settings live in your browser.',
  },
  {
    icon: MinusCircle,
    title: 'No BS',
    body: 'No upsells, no premium tier, no ads, no email signup. Locators front and centre — fluff gone.',
  },
];

export function Promises() {
  return (
    <section id="promises" className="py-16 border-y border-slate-100 dark:border-zinc-900 bg-slate-50 dark:bg-zinc-900/50">
      <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {ITEMS.map((it) => (
          <div key={it.title} className="flex gap-4 items-start">
            <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-emerald-600 text-white inline-flex items-center justify-center">
              <it.icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{it.title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{it.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
