import { Link } from 'react-router-dom';
import { Download, ArrowLeft } from 'lucide-react';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { VERSION, ZIP_PATH } from '@/lib/version';

const STEPS = [
  {
    title: 'Download the zip',
    body: (
      <>
        Click the button below — saves <code className="text-sm bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">locatorforge-v{VERSION}.zip</code> (~73 KB).
      </>
    ),
  },
  { title: 'Unzip', body: 'Right-click the downloaded file → Extract / Unzip. Place the folder somewhere stable (e.g. ~/Tools/locatorforge/).' },
  {
    title: 'Open chrome://extensions',
    body: (
      <>
        Paste <code className="text-sm bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">chrome://extensions</code> into Chrome's address bar.
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
        On any page press <kbd className="px-2 py-0.5 border rounded text-xs">F12</kbd> (or <kbd className="px-2 py-0.5 border rounded text-xs">Cmd</kbd>+<kbd className="px-2 py-0.5 border rounded text-xs">Opt</kbd>+<kbd className="px-2 py-0.5 border rounded text-xs">I</kbd>). Look for the <strong>LocatorForge</strong> tab — or open the Elements panel and find the LocatorForge sidebar.
      </>
    ),
  },
];

export default function Install() {
  return (
    <>
      <Nav />
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link to="/" className="inline-flex items-center text-sm text-emerald-700 hover:underline mb-6">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back home
        </Link>
        <h1 className="text-4xl font-bold tracking-tight mb-3">Install LocatorForge</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          Two minutes. No account. Free forever.
        </p>

        <a href={ZIP_PATH} download className="btn-primary text-base px-6 py-3 mb-10">
          <Download className="w-5 h-5" />
          Download v{VERSION} (zip)
        </a>

        <ol className="space-y-6">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-600 text-white text-sm font-semibold inline-flex items-center justify-center">
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold text-base">{s.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-12 p-5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
          <h3 className="font-semibold text-emerald-800 dark:text-emerald-300">Tip</h3>
          <p className="text-sm text-emerald-900 dark:text-emerald-200 mt-1">
            Pin LocatorForge's sidebar inside the Elements panel — locators auto-update every time you click an element in the DOM tree. No tab switching needed.
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
}
