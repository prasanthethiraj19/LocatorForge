const FW = [
  { label: 'Playwright', sub: 'TS · JS · Python · Java' },
  { label: 'Selenium', sub: 'Java · Python' },
  { label: 'Cypress', sub: 'JavaScript / TypeScript' },
  { label: 'WebdriverIO', sub: 'JavaScript / TypeScript' },
  { label: 'Robot', sub: 'Robot Framework' },
];

export function Frameworks() {
  return (
    <section className="py-16 bg-slate-50 dark:bg-zinc-900/50 border-y border-slate-100 dark:border-zinc-900">
      <div className="max-w-5xl mx-auto px-6">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-8">
          Works with every major framework
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {FW.map((f) => (
            <div key={f.label} className="text-center p-4 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
              <div className="font-semibold">{f.label}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{f.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
