const FW = [
  { label: 'Playwright', sub: 'TS · JS · Python · Java' },
  { label: 'Selenium', sub: 'Java · Python' },
  { label: 'Cypress', sub: 'JavaScript / TypeScript' },
  { label: 'WebdriverIO', sub: 'JavaScript / TypeScript' },
  { label: 'Robot', sub: 'Robot Framework' },
];

export function Frameworks() {
  return (
    <section className="relative overflow-hidden bg-forge-950 py-16">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-ember-600/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(#292524_1px,transparent_1px)] bg-[size:20px_20px] opacity-60" />
      </div>
      <div className="relative mx-auto max-w-5xl px-6">
        <p className="kicker text-center text-ember-400">Works with every major framework</p>
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-5">
          {FW.map((f) => (
            <div
              key={f.label}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-5 text-center transition-colors hover:border-ember-500/50"
            >
              <div className="font-bold text-white">{f.label}</div>
              <div className="mt-1 text-xs text-stone-400">{f.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
