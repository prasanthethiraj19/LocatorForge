# LocatorForge

> Fast Chrome & Edge DevTools extension that generates Playwright, Selenium, Cypress, WebdriverIO and Robot Framework locators — straight from any element on a page. No ads. No tracking. No BS.

[![Free](https://img.shields.io/badge/Free-Forever-10b981)](https://locatorforge.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](./LICENSE)
[![Version](https://img.shields.io/badge/version-0.8.0-emerald)](./extension/package.json)
[![Browsers](https://img.shields.io/badge/browsers-Chrome%20%26%20Edge-blue)](https://locatorforge.com)

**Live site:** [locatorforge.com](https://locatorforge.com)

---

## What it does

Open Chrome or Edge DevTools, click any element in the DOM tree (or use the pick mode), and LocatorForge produces a ranked list of test locators across 9 frameworks. Live match counts, stability ratings, parameterized smart patterns, self-healing chains, Selenium 4 relative locators, recorder, freeze mode, page-wide export — all in one DevTools tab.

## Architecture

```mermaid
flowchart LR
    User([User]) -->|opens DevTools| Chrome[Chrome browser]

    subgraph Extension["LocatorForge extension (MV3)"]
        Devtools[devtools.ts<br/>panel + sidebar pane]
        Panel[panel.html<br/>React + plain CSS]
        Sidepanel[sidepanel.html<br/>iframe wrapper]
        SW[service-worker.ts<br/>port relay + commands]
        ContentPick[content.js<br/>pick overlay]
        ContentFreeze[freeze.js<br/>DOM freeze]
        ContentRec[recorder.js<br/>action recorder]
    end

    subgraph Engine["Locator engine (in panel)"]
        Serialize[serialize.ts<br/>__qlcSerialize $0]
        Generate[generate.ts<br/>generateCandidates]
        Rules[rules/<br/>role / text / label / ... / rel-*]
        Stability[stability.ts<br/>best · good · ok · fragile]
        Format[format.ts<br/>9 framework emitters]
        Smart[smartPatterns.ts]
        Axes[axes.ts]
        Lint[lint.ts]
        Healing[healing.ts]
        Relative[relative.ts<br/>Selenium 4]
    end

    subgraph Features["v0.8 features"]
        Recorder[lib/recorder/<br/>9-fw test emit]
        TestData[lib/testdata/<br/>19 field types]
        Export[lib/export/<br/>page → markdown]
        POM[lib/pom/<br/>basket → Page Object]
        History[useLocatorHistory]
    end

    Chrome --> Devtools
    Devtools --> Panel
    Devtools --> Sidepanel
    Sidepanel -->|iframe| Panel
    Panel <-->|qlc-panel port| SW
    Panel <-->|qlc-recorder port| SW
    SW <-->|tabs.sendMessage| ContentPick
    SW <-->|tabs.sendMessage| ContentFreeze
    SW <-->|tabs.sendMessage| ContentRec
    Panel -->|inspectedWindow.eval| Serialize
    Serialize --> Generate
    Generate --> Rules
    Generate --> Smart
    Generate --> Axes
    Generate --> Relative
    Rules --> Stability
    Stability --> Lint
    Lint --> Healing
    Healing --> Format
    Format -->|TS/JS/Py/Java/Robot| User
    Panel --> Recorder
    Panel --> TestData
    Panel --> Export
    Panel --> POM
    Panel --> History

    Website[website/<br/>Vite + React<br/>locatorforge.com] -.->|hosts .zip downloads| User
```

## Locator generation pipeline

```mermaid
flowchart TD
    Start([User selects element]) --> Read[Panel reads $0 via inspectedWindow.eval]
    Read --> Ser[__qlcSerialize → SerializedElement]
    Ser --> Gen[generateCandidates]

    Gen --> R1[role rule]
    Gen --> R2[testid rule]
    Gen --> R3[text rule]
    Gen --> R4[label / placeholder / alt / title]
    Gen --> R5[smart patterns: example + template]
    Gen --> R6[xpath axes]
    Gen --> R7[Selenium 4 relative locators]
    Gen --> R8[css / xpath fallback]

    R1 --> Count[buildCountSnippet → live match count]
    R2 --> Count
    R3 --> Count
    R4 --> Count
    R5 --> Count
    R6 --> Count
    R7 --> Count
    R8 --> Count

    Count --> Adjust[adjustForUniqueness<br/>uniqueness → stability bump]
    Adjust --> Lint[applyLints<br/>nth-of-type · abs xpath · autogen class]
    Lint --> Heal[attachHealingFallbacks<br/>.or chain]
    Heal --> Sort[sortCandidates<br/>section · stability · rank]
    Sort --> Render[LocatorList → LocatorRow]
    Render --> Copy([Copy / Highlight / Add to POM])
```

## Repo layout

```
locatorforge/
├── extension/                      # Chrome + Edge MV3 extension source
│   ├── src/
│   │   ├── devtools/               # devtools.ts — panel + Elements sidebar pane
│   │   ├── panel/                  # React panel UI
│   │   │   ├── App.tsx
│   │   │   ├── components/         # Toolbar, LocatorList, modals, ...
│   │   │   ├── hooks/              # useSelectedElement, useRecorder, useFreeze, ...
│   │   │   └── lib/
│   │   │       ├── locators/       # generation engine + Selenium 4 relative
│   │   │       ├── export/         # page-wide locator harvest
│   │   │       ├── recorder/       # action recorder emit
│   │   │       ├── testdata/       # 19-type test data generator
│   │   │       ├── pom/            # Page Object generator
│   │   │       └── messaging/      # port message types
│   │   ├── content/                # content.ts (pick), freeze.ts, recorder.ts
│   │   └── background/             # service-worker.ts (port relay, commands, contextMenus)
│   ├── public/                     # manifest.json + manifest.edge.json, sidepanel.html, icons
│   └── scripts/                    # build.mjs + package.mjs (--target=chrome|edge)
└── website/                        # Marketing site (Vite + React + Tailwind)
    ├── src/
    └── public/
        └── downloads/              # built extension zips land here (chrome + edge)
```

## Quick start

### Extension

```bash
cd extension
npm install

npm run build:chrome     # → extension/dist/chrome/
npm run build:edge       # → extension/dist/edge/

npm run package:chrome   # zips dist/chrome/ → ../website/public/downloads/locatorforge-chrome-v{VERSION}.zip
npm run package:edge     # zips dist/edge/   → ../website/public/downloads/locatorforge-edge-v{VERSION}.zip

npm run release          # build + package both browsers in one go
```

Load unpacked in Chrome:

1. `chrome://extensions` → Developer mode on
2. Load unpacked → select `extension/dist/chrome/`
3. Open any page → F12 → **LocatorForge** tab (or pin the LocatorForge sidebar inside Elements)

Load unpacked in Edge:

1. `edge://extensions` → Developer mode on (left sidebar)
2. Load unpacked → select `extension/dist/edge/`
3. Open any page → F12 → **LocatorForge** tab (or pin the LocatorForge sidebar inside Elements)

### Website

```bash
cd website
npm install
npm run dev         # http://localhost:5173
npm run build       # → website/dist/
```

Deploys to Vercel from the `website/` subdirectory.

## Features (v0.8.0)

### Locator generation
- **9 frameworks** — Playwright (TS/JS/Python/Java), Selenium (Java/Python), Cypress, WebdriverIO, Robot Framework
- **Stability scoring** with hover rationale — every candidate rated best/good/ok/fragile, with one-line "why this rating"
- **Smart Patterns** — parameterized templates for form inputs (`${placeholder}`, `${name}`, `${id}`, `${label}`)
- **XPath axes** — ancestor / following / preceding / sibling / parent
- **Selenium 4 relative locators** — `above` / `below` / `near` / `toLeftOf` / `toRightOf`
- **Self-healing chains** — Playwright `.or()` fallbacks
- **Locator linter** — flags absolute xpath, `nth-of-type`, auto-generated CSS class names
- **Shadow DOM + iframe** — auto-detect, auto-emit `frameLocator()` wrappers

### Workflows
- **Pick + highlight** — overlay-based picker; per-row flash on inspected page
- **Test Locator bar** — paste any CSS/XPath, see live match count, attribute autosuggest while typing
- **Action recorder** (`⌘⇧R`) — capture click / fill / select / press → emit full test in chosen framework
- **Freeze DOM** (`⌘⇧F`) — pause page mutations to inspect hover-only menus
- **Test data generator** (`⌘⇧D`) — 19 field types × realistic + edge + invalid columns
- **Page-wide export** (`⌘⇧E`) — harvest all interactive elements → markdown doc
- **Page Object generator** — basket → modal → full POM file
- **Locator history** — last 50 picks persisted across sessions
- **Configurable testid attribute** — `data-testid`, `data-qa`, `data-cy`, custom

### Surfaces
- **Top-level DevTools panel** — full-width workflow
- **Elements sidebar pane** — alongside Styles / Computed / Layout
- **Chrome / Edge Side Panel API** — opens without DevTools (`⌘⇧L` or click toolbar icon)

### Browser support
- **Chrome 116+** and **Microsoft Edge 116+** (plus other Chromium browsers like Brave and Arc)
- Separate `dist/chrome/` and `dist/edge/` builds, each with its own store-facing manifest
- The website offers dedicated download buttons for Chrome and Edge builds

## Privacy

Zero telemetry. Zero analytics. Zero remote calls. All settings live in `chrome.storage.sync` (your browser profile). The website itself uses no analytics, no cookies, no third-party scripts.

Required permissions (and only these): `activeTab`, `scripting`, `storage`, `contextMenus`, `sidePanel`.

## How this was built

See [`How_To_Create.md`](./How_To_Create.md) for the actual prompt sequence used to build LocatorForge with Claude Code.

## Contributing

Open to PRs.

## License

MIT © LocatorForge.
