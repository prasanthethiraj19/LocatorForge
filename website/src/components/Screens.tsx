import { useEffect, useState } from 'react';

const SHOTS = [
  {
    src: '/screens/panel-signin.png',
    alt: 'LocatorForge panel ranking locators for a Sign in button — role, testid and text strategies scored best/good/ok',
    chip: 'Role · Test id · Text',
    caption: 'One element, every strategy — ranked by stability',
  },
  {
    src: '/screens/panel-email.png',
    alt: 'LocatorForge panel for an email input showing label and smart-pattern locators with live match counts',
    chip: 'Label · Smart patterns · Live match',
    caption: 'Form fields get labeled, parameterized patterns',
  },
  {
    src: '/screens/panel-forgot.png',
    alt: 'LocatorForge panel for a Forgot password link showing text, CSS and xpath alternatives',
    chip: 'Text · CSS · XPath',
    caption: 'Copy one line in your framework and paste',
  },
];

export function Screens() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  useEffect(() => {
    if (openIdx === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenIdx(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openIdx]);

  const active = openIdx !== null ? SHOTS[openIdx] : null;

  return (
    <section className="border-y border-stone-200 bg-white py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 max-w-2xl">
          <p className="kicker">See it in action</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-stone-900 md:text-4xl">
            The locator panel, live.
          </h2>
          <p className="mt-3 text-stone-600">
            Pick an element in DevTools — every strategy appears instantly, sorted by stability,
            verified against the page. Click a screenshot to zoom in.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {SHOTS.map((s, i) => (
            <figure key={s.src} className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 shadow-panel">
              <button
                type="button"
                onClick={() => setOpenIdx(i)}
                aria-label={`Open full-size screenshot: ${s.caption}`}
                className="block cursor-zoom-in border-b border-stone-200 p-2"
              >
                <img
                  src={s.src}
                  alt={s.alt}
                  loading="lazy"
                  className="w-full rounded-lg transition-transform duration-300 group-hover:scale-[1.02]"
                />
              </button>
              <figcaption className="flex flex-1 flex-col p-4">
                <div className="mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-ember-600">
                  {s.chip}
                </div>
                <div className="text-sm font-semibold text-stone-900">{s.caption}</div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${active.caption} — full size`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/90 p-4 backdrop-blur-sm sm:p-8"
          onClick={() => setOpenIdx(null)}
        >
          <div className="relative max-h-full max-w-[96vw]" onClick={(e) => e.stopPropagation()}>
            <img
              src={active.src}
              alt={active.alt}
              className="max-h-[88vh] w-auto rounded-xl border border-white/10 shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setOpenIdx(null)}
              className="absolute -right-3 -top-3 flex h-9 w-9 items-center justify-center rounded-full bg-ember-600 text-lg font-bold text-white shadow-lg transition-colors hover:bg-ember-700"
              aria-label="Close full-size screenshot"
            >
              &times;
            </button>
            <div className="mt-3 text-center font-mono text-xs uppercase tracking-wider text-stone-300">
              {active.chip} — click outside or press Esc to close
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
