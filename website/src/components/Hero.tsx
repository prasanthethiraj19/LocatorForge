import { Link } from 'react-router-dom';
import { Download, BookOpen } from 'lucide-react';
import { VERSION, CHROME_ZIP_PATH, EDGE_ZIP_PATH } from '@/lib/version';

const ROWS = [
  {
    dot: 'bg-emerald-500',
    chip: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    label: 'Best',
    code: `getByRole('button', { name: 'Sign in' })`,
  },
  {
    dot: 'bg-ember-500',
    chip: 'bg-ember-100 text-ember-700 ring-ember-200',
    label: 'Good',
    code: `getByTestId('signin')`,
  },
  {
    dot: 'bg-amber-400',
    chip: 'bg-amber-100 text-amber-700 ring-amber-200',
    label: 'OK',
    code: `getByLabel('Email').fill(...)`,
  },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-ember-200/50 blur-3xl" />
        <div className="absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(#d6d3d1_1px,transparent_1px)] bg-[size:22px_22px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_35%,black,transparent)] opacity-60" />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pt-16 pb-20 lg:grid-cols-[1fr_1.05fr] lg:pt-24">
        <div>
          <span className="pill mb-7">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember-500 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-ember-500" />
            </span>
            Free forever &middot; No ads &middot; No tracking &middot; v{VERSION}
          </span>

          <h1 className="text-5xl font-extrabold leading-[0.95] tracking-tighter text-stone-900 sm:text-6xl xl:text-7xl">
            Locators,
            <br />
            forged from{' '}
            <span className="bg-gradient-to-r from-ember-600 to-amber-500 bg-clip-text text-transparent">
              your DOM.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-stone-600">
            Fast Playwright, Selenium, Cypress, WebdriverIO and Robot Framework locators,
            straight from Chrome &amp; Edge DevTools.
          </p>
          <p className="mt-3 font-mono text-sm text-stone-400">
            $ snap &rarr; locator &rarr; paste &rarr; done.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a href={CHROME_ZIP_PATH} download className="btn-primary px-6 py-3 text-base">
              <Download className="h-5 w-5" />
              Download for Chrome
            </a>
            <a href={EDGE_ZIP_PATH} download className="btn-outline px-6 py-3 text-base">
              <Download className="h-5 w-5" />
              Download for Edge
            </a>
            <Link to="/install" className="btn-ghost px-4 py-3 text-base">
              <BookOpen className="h-5 w-5" />
              How to install
            </Link>
          </div>

          <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-500">
            {['Free forever', 'No account required', 'Works on any website'].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <span className="text-ember-600">&#10003;</span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div aria-hidden className="relative select-none">
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-ember-500/15 via-transparent to-amber-400/10 blur-xl" />
          <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-panel">
            <div className="flex items-center justify-between bg-forge-950 px-4 py-3">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                <span className="h-2.5 w-2.5 rounded-full bg-ember-400" />
              </div>
              <span className="font-mono text-[11px] text-stone-400">
                LocatorForge &mdash; inspected element
              </span>
              <span className="rounded-full border border-ember-500/40 bg-ember-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-ember-400">
                9 frameworks
              </span>
            </div>

            <div className="flex items-center gap-2 border-b border-stone-100 bg-stone-50 px-4 py-2.5">
              <span className="font-mono text-[11px] text-stone-400">selected:</span>
              <span className="rounded-md bg-forge-950 px-2 py-1 font-mono text-xs text-stone-200">
                {`<button class="signin">`}
              </span>
            </div>

            <div className="space-y-2 px-4 py-4">
              {ROWS.map((r) => (
                <div
                  key={r.label}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border border-stone-200/80 bg-white px-3 py-2.5"
                >
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ring-1 ${r.chip}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${r.dot}`} />
                    {r.label}
                  </span>
                  <code className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs text-stone-800">
                    {r.code}
                  </code>
                  <span className="font-mono text-[10px] text-stone-400">1/1</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-stone-100 bg-stone-50 px-4 py-2.5">
              <span className="font-mono text-[10px] text-stone-400">stability ranking</span>
              <span className="font-mono text-[10px] font-semibold text-ember-600">
                recommended &rarr; Playwright TS
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
