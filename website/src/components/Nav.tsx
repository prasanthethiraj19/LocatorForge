import { Link } from 'react-router-dom';
import { Github } from 'lucide-react';

export function Nav() {
  return (
    <nav className="sticky top-0 z-40 w-full backdrop-blur bg-white/80 dark:bg-zinc-950/80 border-b border-slate-200 dark:border-zinc-800">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-emerald-600 text-white font-mono font-bold text-sm">LF</span>
          <span className="font-semibold text-lg">LocatorForge</span>
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <a href="/#features" className="btn-ghost hidden sm:inline-flex">Features</a>
          <Link to="/install" className="btn-ghost hidden sm:inline-flex">Install</Link>
          <Link to="/privacy" className="btn-ghost hidden sm:inline-flex">Privacy</Link>
          <a
            href="https://github.com/prasanthethiraj19"
            target="_blank"
            rel="noreferrer"
            className="btn-outline"
          >
            <Github className="w-4 h-4" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </div>
    </nav>
  );
}
