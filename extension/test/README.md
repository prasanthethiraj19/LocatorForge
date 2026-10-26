# Locator engine fixtures — frames / shadow DOM / SVG

Verifies that `generateCandidates` + `formatExpression` produce correct locators
for elements inside same-origin iframes (nested), open shadow roots (nested),
and SVG nodes.

## Fixtures

- `index.html` — top document: plain button, two SVGs (with/without id), a
  double-nested shadow host (`#host` → `#host2`), and an iframe `#outer`.
- `frame.html` — first-level frame with `#frame-btn` and iframe `#inner`.
- `nested.html` — deepest frame with `#nested-btn`.
- `harness.ts` — imports the real serializer/generator/formatter and exposes
  `window.__qlcTest.run(el, frameworkId)`.
- `check.js` — runs every target and returns a PASS/FAIL JSON report
  (frame/shadow chain length, emitted expression, live match count).
- `index.html` renders that report inline at the bottom of the page (PASS/FAIL
  table + sample locators), so opening the page is enough to verify.
- `serve.mjs` serves the fixtures on `0.0.0.0:8123` for LAN testing.
- `lan-serve.mjs` serves the packaged zips from `website/public/downloads` on
  `0.0.0.0:8080`.

## Run

```bash
npm run test:fixtures        # builds test/harness.js
node test/serve.mjs          # serves this dir on :8123
# in another terminal:
agent-browser open http://localhost:8123/index.html
agent-browser eval -b "$(base64 -w0 test/check.js)"   # base64 the file for your shell
agent-browser close
```

`"pass": true` means every assertion in `check.js` succeeded.
