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
    q: 'Is the source code open?',
    a: 'Yes. Available on GitHub. Build it yourself, audit the code, fork it, contribute back.',
  },
];

export function FAQ() {
  return (
    <section className="py-20">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Questions.</h2>
        </div>
        <div className="space-y-3">
          {QUESTIONS.map((item) => (
            <details key={item.q} className="group card cursor-pointer">
              <summary className="flex items-center justify-between font-semibold list-none">
                <span>{item.q}</span>
                <span className="text-emerald-600 group-open:rotate-45 transition-transform text-2xl leading-none">+</span>
              </summary>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-3 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
