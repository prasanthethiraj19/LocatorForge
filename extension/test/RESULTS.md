# LocatorForge — locator engine test results

Run: 2026-10-05. Engine = real `serialize` + `generateCandidates` + `formatExpression`
+ `buildCountSnippet` (the exact code the panel runs), injected into the live page.

## 1. Local fixtures — `extension/test/`

`test/harness.ts` bundled to `test/harness.js`, driven by `test/check.js` on
`test/index.html` (frames, nested frames, shadow, nested shadow, SVG).

Result: **23 / 23 PASS** (`pass: true`).

## 2. Sweep — https://app.thetestingacademy.com/playwright/

`probe-c.js` walks every interactive element (`button,a,input,select,textarea`,
`[role=button|link|checkbox|radio|switch|tab|menuitem]`, `[data-testid]`) in the
main document, all same-origin frames (recursive) and all open shadow roots, then
runs `__qlcTest.run(el)` and evaluates each candidate's live count.

Per page: `total` = elements tested, `noUnique` = elements with **no** unique
locator (hard failure), `topNotUnique` = unique exists but page has duplicate
chrome/rows so the first candidate isn't unique (the panel demotes these and
surfaces a unique one).

| page | total | crash | noCand | noUnique | topNotUnique |
|---|---|---|---|---|---|
| widgets/svg.html | 16 | 0 | 0 | 0 | 0 |
| widgets/shadow-dom.html | 21 | 0 | 0 | 0 | 0 |
| widgets/calendar.html | 80 | 0 | 0 | 0 | 0 |
| widgets/dnd.html | 20 | 0 | 0 | 0 | 0 |
| widgets/toasts.html | 8 | 0 | 0 | 0 | 0 |
| widgets/dialogs.html | 12 | 0 | 0 | 0 | 0 |
| widgets/hover-menu.html | 16 | 0 | 0 | 0 | 2 |
| widgets/context-menu.html | 4 | 0 | 0 | 0 | 0 |
| widgets/keyboard-form.html | 14 | 0 | 0 | 0 | 0 |
| widgets/upload-download.html | 11 | 0 | 0 | 0 | 0 |
| widgets/scroll.html | 21 | 0 | 0 | 0 | 0 |
| widgets/expect.html | 7 | 0 | 0 | 0 | 0 |
| widgets/windows-tabs.html | 6 | 0 | 0 | 0 | 0 |
| widgets/data-driven.html | 19 | 0 | 0 | 0 | 0 |
| widgets/test-modifiers.html | 9 | 0 | 0 | 0 | 0 |
| network/intercept.html | 18 | 0 | 0 | 0 | 0 |
| tables/practice.html | 32 | 0 | 0 | 0 | 0 |
| tables/dropdowns.html | 8 | 0 | 0 | 0 | 0 |
| tables/select-boxes.html | 18 | 0 | 0 | 0 | 2 |
| tables/webtable.html | 24 | 0 | 0 | 0 | 0 |
| tables/webtable1.html | 5 | 0 | 0 | 0 | 0 |
| tables/sortable.html | 80 | 0 | 0 | 0 | 42 |
| tables/scorecard.html | 7 | 0 | 0 | 0 | 0 |
| multiple_element_filter.html | 36 | 0 | 0 | 0 | 10 |
| webtable.html | 13 | 0 | 0 | 0 | 0 |
| ttacart/index.html | 3 | 0 | 0 | 0 | 0 |
| booking/index.html | 19 | 0 | 0 | 0 | 0 |
| frames/nested-iframes.html | 3 | 0 | 0 | 0 | 0 |
| frames/multi-frames.html | 4 | 0 | 0 | 0 | 0 |
| frames/courses-frameset.html | 6 | 0 | 0 | 0 | 0 |
| **total** | **541** | **0** | **0** | **0** | **56** |

**0 crashes · 0 "no candidates" · 0 elements without a unique locator.**

### Frame / shadow / SVG chains (spot-checked, count = 1)

- nested iframes (3-deep): `page.frameLocator("#pact1").frameLocator("#pact2").frameLocator("#pact3")...`
- frameset (`<frame>`): `page.frameLocator('frame[name="side"]')`, `frame[name="navbar"]`, `frame[name="content"]`
- nested shadow: `page.locator("#host").locator("#host2").getByRole(...)`
- SVG: `#id` when present, else `[data-testid="..."]`, else `tag[aria-label="..."]`; no bare-tag `rect`/`svg` emitted.

## 3. Reproduce

```bash
cd extension
npm run test:fixtures          # build test/harness.js
node test/serve.mjs            # :8123
# open http://localhost:8123/index.html and run test/check.js in the page
```

The page-level sweep needs the harness injected into a live browser page
(`test/harness.js`) followed by the probe script; see `probe-c.js`.

## 4. Pick-flow fixes verified by build

- `src/background/service-worker.ts` — on `PICK_RESULT`, sends `PICK_CANCEL` to every frame.
- `src/content/content.ts` — click always exits pick mode.
- `typecheck` clean; `build:chrome`, `build:edge`, `package:*` regenerated.
