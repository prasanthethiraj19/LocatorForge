import { Download } from 'lucide-react';
import { VERSION, CHROME_ZIP_PATH, EDGE_ZIP_PATH } from '@/lib/version';

export function CTA() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="relative overflow-hidden rounded-3xl bg-forge-950 px-8 py-16 text-center shadow-panel sm:px-16">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-ember-600/25 blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(#292524_1px,transparent_1px)] bg-[size:22px_22px] opacity-40" />
          </div>
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-white md:text-5xl">
              Stop hunting for locators.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-stone-300">
              Install once. Snap any element. Get the best locator instantly. In every framework.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <a
                href={CHROME_ZIP_PATH}
                download
                className="btn bg-ember-600 px-6 py-3 text-base text-white hover:bg-ember-500"
              >
                <Download className="h-5 w-5" />
                Download for Chrome
              </a>
              <a
                href={EDGE_ZIP_PATH}
                download
                className="btn border-2 border-white/25 px-6 py-3 text-base text-white hover:border-white/50 hover:bg-white/5"
              >
                <Download className="h-5 w-5" />
                Download for Edge
              </a>
            </div>
            <p className="mt-6 font-mono text-xs text-stone-400">
              Free &middot; v{VERSION} &middot; No account
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
