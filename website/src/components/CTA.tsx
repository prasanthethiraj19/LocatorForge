import { Download } from 'lucide-react';
import { VERSION, CHROME_ZIP_PATH, EDGE_ZIP_PATH } from '@/lib/version';

export function CTA() {
  return (
    <section className="py-24 bg-emerald-600">
      <div className="max-w-4xl mx-auto px-6 text-center text-white">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
          Stop hunting for locators.
        </h2>
        <p className="text-emerald-50 text-lg md:text-xl mb-8 max-w-2xl mx-auto">
          Install once. Snap any element. Get the best locator instantly. In every framework.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a href={CHROME_ZIP_PATH} download className="inline-flex items-center gap-2 rounded-md bg-white text-emerald-700 hover:bg-emerald-50 px-6 py-3 text-base font-semibold transition-colors">
            <Download className="w-5 h-5" />
            Download for Chrome
          </a>
          <a href={EDGE_ZIP_PATH} download className="inline-flex items-center gap-2 rounded-md border-2 border-emerald-400/70 text-white hover:bg-emerald-500 px-6 py-3 text-base font-semibold transition-colors">
            <Download className="w-5 h-5" />
            Download for Edge
          </a>
        </div>
        <p className="text-xs text-emerald-100 mt-4">Free · v{VERSION} · No account</p>
      </div>
    </section>
  );
}
