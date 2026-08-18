import { Link } from 'react-router-dom';
import { Download, BookOpen, ChevronDown } from 'lucide-react';
import { VERSION, CHROME_ZIP_PATH, EDGE_ZIP_PATH } from '@/lib/version';

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-50 via-white to-white dark:from-emerald-950/30 dark:via-zinc-950 dark:to-zinc-950" />
      <div className="absolute inset-0 -z-10 opacity-30 [background-image:radial-gradient(#10b98133_1px,transparent_1px)] [background-size:20px_20px]" />

      <div className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <span className="pill mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Free · No ads · No tracking · v{VERSION}
        </span>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
          Locator<span className="text-emerald-600">Forge</span>
        </h1>
        <p className="text-xl md:text-2xl text-slate-700 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
          Fast Playwright, Selenium, Cypress, WebdriverIO and Robot Framework locators —
          <br className="hidden md:block" />
          straight from Chrome &amp; Edge DevTools.
        </p>
        <p className="text-base text-slate-500 dark:text-slate-400 mt-3 font-mono">
          $ snap → locator → paste → done.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mt-10">
          <a href={CHROME_ZIP_PATH} download className="btn-primary text-base px-6 py-3">
            <Download className="w-5 h-5" />
            Download for Chrome
          </a>
          <a href={EDGE_ZIP_PATH} download className="btn-outline text-base px-6 py-3">
            <Download className="w-5 h-5" />
            Download for Edge
          </a>
          <Link to="/install" className="btn-outline text-base px-6 py-3">
            <BookOpen className="w-5 h-5" />
            How to install
          </Link>
        </div>

        <div className="mt-12 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <span>✓ Free forever</span>
          <span>✓ No account required</span>
          <span>✓ Works on any website</span>
        </div>

        <a href="#promises" className="inline-flex items-center mt-12 text-slate-400 hover:text-emerald-600 transition-colors" aria-label="Scroll to features">
          <ChevronDown className="w-5 h-5 animate-bounce" />
        </a>
      </div>
    </section>
  );
}
