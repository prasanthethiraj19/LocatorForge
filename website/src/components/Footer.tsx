import { Link } from 'react-router-dom';
import { VERSION } from '@/lib/version';

export function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-stone-50 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 text-sm text-stone-500 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-ember-500 to-ember-700 font-mono text-xs font-bold text-white">
            LF
          </span>
          <div>
            <div className="font-bold text-stone-900">LocatorForge</div>
            <div className="text-xs">Free locators, forged from your DOM</div>
          </div>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Footer">
          <Link to="/install" className="transition-colors hover:text-ember-700">
            Install
          </Link>
          <Link to="/privacy" className="transition-colors hover:text-ember-700">
            Privacy
          </Link>
          <a href="/#features" className="transition-colors hover:text-ember-700">
            Features
          </a>
        </nav>
      </div>
      <div className="mx-auto mt-8 flex max-w-6xl flex-col gap-1 px-6 font-mono text-[11px] text-stone-400 sm:flex-row sm:items-center sm:justify-between">
        <span>© {new Date().getFullYear()} LocatorForge. Free forever.</span>
        <span>v{VERSION} · Chrome &amp; Edge · no ads · no tracking</span>
      </div>
    </footer>
  );
}
