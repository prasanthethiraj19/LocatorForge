import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Database, Wifi, UserX } from 'lucide-react';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';

const ITEMS = [
  { icon: UserX, label: 'No accounts. No signup.' },
  { icon: Wifi, label: 'No external network calls. Ever.' },
  { icon: Database, label: 'No analytics. No telemetry. No cookies.' },
  { icon: Shield, label: 'Settings stay in your browser via chrome.storage.sync.' },
];

export default function Privacy() {
  return (
    <>
      <Nav />
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link to="/" className="inline-flex items-center text-sm text-emerald-700 hover:underline mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back home
        </Link>
        <h1 className="text-4xl font-bold tracking-tight mb-3">Privacy</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          The short version: <strong>we don't collect anything</strong>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-10">
          {ITEMS.map((it) => (
            <div key={it.label} className="flex items-center gap-3 p-4 rounded-lg border border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-900">
              <it.icon className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span className="text-sm text-slate-700 dark:text-slate-300">{it.label}</span>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-bold mt-10 mb-3">Permissions</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
          LocatorForge requests three Chrome permissions. Here's why each is needed:
        </p>
        <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
          <li>
            <code className="bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">activeTab</code> —
            lets the extension read the DOM of the currently inspected tab when you actively engage
            with it. Scoped to the active tab only.
          </li>
          <li>
            <code className="bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">scripting</code> —
            lets DevTools inject the pick-element overlay and read element references for locator
            generation.
          </li>
          <li>
            <code className="bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">storage</code> —
            stores your settings (chosen framework, testid attribute name, smart-pattern toggle) in
            Chrome's local sync store. Never sent to a server.
          </li>
        </ul>

        <p className="text-sm text-slate-600 dark:text-slate-400 mt-6">
          The extension does <strong>not</strong> request:{' '}
          <code className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded">tabs</code>,{' '}
          <code className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded">host_permissions</code>,{' '}
          <code className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded">cookies</code>,{' '}
          <code className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded">history</code>, or any
          broad-access permission.
        </p>

        <h2 className="text-xl font-bold mt-10 mb-3">Website</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          locatorforge.com itself uses no analytics, no cookies, and no third-party scripts. The page
          you're reading is static HTML hosted on Vercel.
        </p>

        <p className="text-xs text-slate-400 mt-12">Last updated: 2026-05-13</p>
      </div>
      <Footer />
    </>
  );
}
