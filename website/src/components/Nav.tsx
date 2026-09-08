import { Link } from 'react-router-dom';

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-stone-50/85 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link to="/" className="group flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-ember-500 to-ember-700 font-mono text-sm font-bold text-white shadow-sm transition-colors group-hover:from-ember-400 group-hover:to-ember-600">
            LF
          </span>
          <span className="text-lg font-bold tracking-tight text-stone-900">LocatorForge</span>
        </Link>
        <div className="flex items-center gap-1 text-sm">
          <a href="/#features" className="btn-ghost hidden sm:inline-flex">
            Features
          </a>
          <Link to="/privacy" className="btn-ghost hidden sm:inline-flex">
            Privacy
          </Link>
          <Link to="/install" className="btn-primary ml-1">
            Install
          </Link>
        </div>
      </nav>
    </header>
  );
}
