import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, ArrowLeft } from 'lucide-react';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { VERSION, CHROME_ZIP_PATH, EDGE_ZIP_PATH } from '@/lib/version';

type Browser = 'chrome' | 'edge';

const BROWSERS: { id: Browser; label: string; url: string; extensionsUrl: string }[] = [
  { id: 'chrome', label: 'Chrome', url: 'chrome://extensions', extensionsUrl: 'Chrome' },
  { id: 'edge', label: 'Edge', url: 'edge://extensions', extensionsUrl: 'Edge' },
];

const STEPS: Record<Browser, { title: string; body: React.ReactNode }[]> = {
  chrome: [
    {
      title: 'Download the zip',
      body: (
        <>
          Click the Chrome button below — saves <code className="code-chip">locatorforge-chrome-v{VERSION}.zip</code>.
        </>
      ),
    },
    { title: 'Unzip', body: 'Right-click the downloaded file → Extract / Unzip. Place the folder somewhere stable (e.g. ~/Tools/locatorforge/).' },
    {
      title: 'Open chrome://extensions',
      body: (
        <>
          Paste <code className="code-chip">chrome://extensions</code> into Chrome's address bar.
        </>
      ),
    },
    {
      title: 'Enable Developer mode',
      body: 'Top-right corner — flip the Developer mode switch on.',
    },
    {
      title: 'Click "Load unpacked"',
      body: 'Top-left of the page. Browse to the unzipped folder and select it.',
    },
    {
      title: 'Open DevTools',
      body: (
        <>
          On any page press <kbd className="rounded border border-stone-300 px-2 py-0.5 font-mono text-xs">F12</kbd> (or <kbd className="rounded border border-stone-300 px-2 py-0.5 font-mono text-xs">Cmd</kbd>+<kbd className="rounded border border-stone-300 px-2 py-0.5 font-mono text-xs">Opt</kbd>+<kbd className="rounded border border-stone-300 px-2 py-0.5 font-mono text-xs">I</kbd>). Look for the <strong>LocatorForge</strong> tab — or open the Elements panel and find the LocatorForge sidebar.
        </>
      ),
    },
  ],
  edge: [
    {
      title: 'Download the zip',
      body: (
        <>
          Click the Edge button below — saves <code className="code-chip">locatorforge-edge-v{VERSION}.zip</code>.
        </>
      ),
    },
    { title: 'Unzip', body: 'Right-click the downloaded file → Extract / Unzip. Place the folder somewhere stable (e.g. ~/Tools/locatorforge/).' },
    {
      title: 'Open edge://extensions',
      body: (
        <>
          Paste <code className="code-chip">edge://extensions</code> into Edge's address bar.
        </>
      ),
    },
    {
      title: 'Enable Developer mode',
      body: 'Left sidebar — flip the Developer mode switch on.',
    },
    {
      title: 'Click "Load unpacked"',
      body: 'Top-left of the page. Browse to the unzipped folder and select it.',
    },
    {
      title: 'Open DevTools',
      body: (
        <>
          On any page press <kbd className="rounded border border-stone-300 px-2 py-0.5 font-mono text-xs">F12</kbd> (or <kbd className="rounded border border-stone-300 px-2 py-0.5 font-mono text-xs">Cmd</kbd>+<kbd className="rounded border border-stone-300 px-2 py-0.5 font-mono text-xs">Opt</kbd>+<kbd className="rounded border border-stone-300 px-2 py-0.5 font-mono text-xs">I</kbd>). Look for the <strong>LocatorForge</strong> tab — or open the Elements panel and find the LocatorForge sidebar.
        </>
      ),
    },
  ],
};

export default function Install() {
  const [browser, setBrowser] = useState<Browser>('chrome');
  const current = BROWSERS.find((b) => b.id === browser)!;
  const zipPath = browser === 'chrome' ? CHROME_ZIP_PATH : EDGE_ZIP_PATH;

  return (
    <>
      <Nav />
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link to="/" className="mb-6 inline-flex items-center text-sm font-medium text-ember-700 hover:underline">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back home
        </Link>
        <h1 className="text-4xl font-extrabold tracking-tight text-stone-900">Install LocatorForge</h1>
        <p className="mb-8 mt-2 text-stone-600">Two minutes. No account. Free forever.</p>

        <div className="mb-8 flex gap-3">
          {BROWSERS.map((b) => (
            <button
              key={b.id}
              onClick={() => setBrowser(b.id)}
              className={`rounded-lg border px-5 py-2.5 text-sm font-semibold transition-colors ${
                browser === b.id
                  ? 'border-ember-600 bg-ember-600 text-white shadow-sm'
                  : 'border-stone-300 bg-white text-stone-600 hover:border-ember-500 hover:text-ember-700'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>

        <a href={zipPath} download className="btn-primary mb-10 px-6 py-3 text-base">
          <Download className="h-5 w-5" />
          Download v{VERSION} for {current.label} (zip)
        </a>

        <ol className="space-y-6">
          {STEPS[browser].map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ember-500 to-ember-700 text-sm font-bold text-white">
                {i + 1}
              </span>
              <div>
                <h3 className="font-bold text-stone-900">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-stone-600">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-12 rounded-xl border border-ember-200 bg-ember-50/70 p-5">
          <h3 className="font-bold text-ember-800">Tip</h3>
          <p className="mt-1 text-sm text-ember-900">
            Pin LocatorForge's sidebar inside the Elements panel — locators auto-update every time you click an element in the DOM tree. No tab switching needed.
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
}
