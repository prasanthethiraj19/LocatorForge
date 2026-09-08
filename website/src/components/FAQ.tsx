const QUESTIONS = [
  {
    q: 'Is LocatorForge really free?',
    a: 'Yes. Free forever. No paid tier, no trial, no signup.',
  },
  {
    q: 'Do you collect any data?',
    a: 'No. LocatorForge runs 100% locally in your browser. No telemetry, no analytics, no remote calls. Your settings live in chrome.storage.sync (owned by your Chrome profile).',
  },
  {
    q: 'Which frameworks are supported?',
    a: 'Playwright (TypeScript, JavaScript, Python, Java), Selenium (Java, Python), Cypress, WebdriverIO, and Robot Framework. One dropdown switches the output syntax.',
  },
  {
    q: 'Does it work with Shadow DOM and iframes?',
    a: 'Yes. LocatorForge auto-detects shadow root boundaries and iframe contexts. For Playwright it emits frameLocator() wrappers automatically. For other frameworks it provides matching idiomatic helpers.',
  },
  {
    q: 'Which browsers are supported?',
    a: 'Chrome and Microsoft Edge (plus other Chromium browsers like Brave and Arc). Grab the matching build from the download buttons — Firefox is on the roadmap.',
  },
  {
    q: 'Can I publish to the Chrome Web Store?',
    a: 'In progress. For now, load the .zip as an unpacked extension via chrome://extensions → Developer mode → Load unpacked. Takes 30 seconds.',
  },
  {
    q: 'How do I get the extension?',
    a: 'Download the Chrome or Edge build straight from this site. No account, no email, no store yet — the download buttons above give you the signed zip for your browser.',
  },
];

export function FAQ() {
  return (
    <section className="border-t border-stone-200 bg-white py-20">
      <div className="mx-auto max-w-3xl px-6">
        <div className="mb-12 text-center">
          <p className="kicker">FAQ</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-stone-900 md:text-4xl">
            Questions.
          </h2>
        </div>
        <div className="space-y-3">
          {QUESTIONS.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl border border-stone-200 bg-white px-5 shadow-sm transition-colors open:border-ember-300 hover:border-stone-300"
            >
              <summary className="flex list-none cursor-pointer items-center justify-between gap-4 py-4 font-semibold text-stone-900 [&::-webkit-details-marker]:hidden">
                <span>{item.q}</span>
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-stone-300 bg-white font-mono text-sm font-bold text-stone-600 shadow-sm transition-all group-open:rotate-45 group-open:border-ember-600 group-open:bg-ember-600 group-open:text-white">
                  +
                </span>
              </summary>
              <p className="pb-4 text-sm leading-relaxed text-stone-600">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
