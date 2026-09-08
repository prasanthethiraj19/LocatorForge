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
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link to="/" className="mb-6 inline-flex items-center text-sm font-medium text-ember-700 hover:underline">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back home
        </Link>
        <h1 className="text-4xl font-extrabold tracking-tight text-stone-900">Privacy</h1>
        <p className="mb-8 mt-2 text-stone-600">
          The short version: <strong className="text-stone-900">we don't collect anything</strong>.
        </p>

        <div className="mb-10 grid grid-cols-1 gap-3 md:grid-cols-2">
          {ITEMS.map((it) => (
            <div
              key={it.label}
              className="flex items-center gap-3 rounded-xl border border-ember-200/80 bg-ember-50/50 p-4"
            >
              <it.icon className="h-5 w-5 flex-shrink-0 text-ember-600" />
              <span className="text-sm text-stone-700">{it.label}</span>
            </div>
          ))}
        </div>

        <h2 className="mb-3 mt-10 text-xl font-extrabold text-stone-900">Permissions</h2>
        <p className="mb-3 text-sm text-stone-600">
          LocatorForge requests three Chrome permissions. Here's why each is needed:
        </p>
        <ul className="space-y-3 text-sm text-stone-700">
          <li>
            <code className="code-chip">activeTab</code> — lets the extension read the DOM of the
            currently inspected tab when you actively engage with it. Scoped to the active tab only.
          </li>
          <li>
            <code className="code-chip">scripting</code> — lets DevTools inject the pick-element
            overlay and read element references for locator generation.
          </li>
          <li>
            <code className="code-chip">storage</code> — stores your settings (chosen framework,
            testid attribute name, smart-pattern toggle) in Chrome's local sync store. Never sent to
            a server.
          </li>
        </ul>

        <p className="mt-6 text-sm text-stone-600">
          The extension does <strong className="text-stone-900">not</strong> request:{' '}
          <code className="code-chip">tabs</code>,{' '}
          <code className="code-chip">host_permissions</code>,{' '}
          <code className="code-chip">cookies</code>,{' '}
          <code className="code-chip">history</code>, or any broad-access permission.
        </p>

        <h2 className="mb-3 mt-10 text-xl font-extrabold text-stone-900">Website</h2>
        <p className="text-sm text-stone-600">
          locatorforge.com itself uses no analytics, no cookies, and no third-party scripts. The
          page you're reading is static HTML hosted on Vercel.
        </p>

        <p className="mt-12 font-mono text-xs text-stone-400">Last updated: 2026-05-13</p>
      </div>
      <Footer />
    </>
  );
}
