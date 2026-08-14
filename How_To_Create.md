# How LocatorForge was built — the prompt log

This document records the actual conversation that built LocatorForge from a one-liner to a v0.8.0 9-framework Chrome DevTools extension + marketing site. Every prompt below was typed by the project owner. The model (Claude) implemented each prompt as a sequence of tool calls (`Read`, `Edit`, `Write`, `Bash`, sub-agent spawns).

Competitor brand names have been replaced with **Competitor A** and **Competitor B** throughout. The actual code, copy, and commits contain zero references to any third-party brand — that was a hard rule from prompt #1.

---

## Phase 0 — initial brief

> **Prompt 1**
> "Your task is to build a superclone of a popular locator extension — a simple Chrome extension which will allow anyone to select the Playwright locators from the page. This will be added as a Chrome DevTools, where in the inspect element they can see this will be added. We will call this a Quick Locators Extension. Perform heavy research about it. Hard rule: zero references to **Competitor A** (the original extension we are replacing) or its author in any code, copy, URL, comment, or commit."

> **Prompt 2**
> "Start building it when you think you are ready."

Outcome: scaffolded `chrome-extension/` with Vite + esbuild build pipeline, MV3 manifest, devtools panel registration, content script for pick overlay, service worker as port relay. Locator engine v0.1.0 with 9 rules (role → text → label → placeholder → altText → title → testid → css → xpath). React 18 panel UI with toolbar, locator list, copy buttons. Brand: LocatorForge.

---

## Phase 1 — feature expansion

> **Prompt 3**
> "Well done for the initial release. We are going to work on this, and we need a lot of features. We will let you know. We will work on it. Okay, quick locators."

> **Prompt 4** — *5 reference screenshots of **Competitor B** (a paid multi-framework locator extension) attached*
> [no text — screenshots show: multi-framework picker, stability badges, sections, smart patterns, chained locator, copy menu variants]

> **Prompt 5**
> "You can see that there are a couple of suggestions that I have added over reference images. Please make sure that you change the coloring and everything differently. Also, change the UI if possible, and make it super easy to use."

> **Prompt 6**
> "continue"

Outcome (v0.2 → v0.4): added 9-framework emit family, stability scoring (best/good/ok/fragile), section grouping (Recommended / Smart / Alternative / Axes / Fallback), Smart Patterns dual emit (example + parameterized template), XPath axes, self-healing `.or()` chains, locator linter, Test Locator bar with on-page flash, locator history drawer, Page Object generator (basket → modal → full POM file in 9 frameworks). Brand recoloring to emerald `#059669`, dense IDE-flavored layout.

---

## Phase 2 — UX pain points + research

> **Prompt 7**
> "When I click on the pick button, this window opens up. Can we do something? Can we add this to style computed layout or event listener where it will be automatically open when I select something?"

Outcome: registered an Elements sidebar pane (`chrome.devtools.panels.elements.createSidebarPane`) alongside the top-level panel. Both surfaces share state via a `Set<Port>` fan-out in the service worker, so the panel auto-updates when the user clicks any element in the DOM tree.

> **Prompt 8**
> "Tell me what are the things to do heavy research on this and tell me what are the different features that we should be doing. Prioritize them, the top 10 features we will be picking. For example, our competitor is **Competitor A**. Include those features also."

Outcome: deep-research pass via WebSearch + WebFetch on both competitors. Returned top-10 candidates with impact/effort estimates. Owner reviewed and approved the list.

> **Prompt 9**
> "I want you to start working on all the features which you have finalized and make sure that you include them. Improve the UI also more so that it can be available easily. When we select an item, it should open the extension also in the Chrome DevTool. That also we need to keep improving it and make sure that you do deep research also if you figured out the top five features that should be available. Give me the 10 best names that you think are good with search on Namecheap available also via Chrome."

Outcome: 10 candidate domain names sourced via `dig +short NS` (NS empty ⇒ available). Owner picked `snaplocator.com`.

---

## Phase 3 — rebrand

> **Prompt 10**
> "snaplocator.com — let's use this. USP is quick and fast locator with no ads, no data collect and to the point, no BS."

Outcome: full rebrand from Quick Locators → SnapLocator. Every reference in code, manifest, brand strings, scripts, modal headers, README, etc. updated in a single sweep. Tagline: "fast · no ads · no tracking · no BS".

---

## Phase 4 — website

> **Prompt 11**
> "In the same repo, let's start creating the website also for the launch. Create the GitHub repo and keep this code also in that. We will push to it and also push the website to Vercel soon."

Outcome: created `/Users/promode/Documents/TTA/snaplocator/` monorepo with `extension/` (Chrome MV3 extension) and `website/` (Vite + React + Tailwind marketing site). Components: Nav, Hero, Promises, Frameworks strip, Features grid, CodeSample tabbed code, HowItWorks 3-step, FAQ, CTA, Footer. Routes: `/`, `/install`, `/privacy`, `*`. Vercel deploy config (`vercel.json`) with rewrites for SPA + cache headers for `/downloads`. MIT license. Initial commit `1f598d8`.

> **Prompt 12**
> "Host it and let's see" → "I mean local" → "open local, let me see first"

Outcome: spawned `vite dev` on background task, opened http://localhost:5173/ in browser.

> **Prompt 13**
> "Stop server"

Outcome: killed background task.

---

## Phase 5 — bug fix

> **Prompt 14**
> "Continue from where you left off."

> **Prompt 15** (the bug report)
> "There is a very important bug that I have seen here: whenever I select an element, I don't see that SnapLocator opens."

Diagnosis: pick handler called `inspect(document.querySelector(...))` after `PICK_RESULT`. Chrome's `inspect()` API switches DevTools to Elements panel — so the SnapLocator top tab "disappeared" the moment the user picked an element.

Fix:
- `usePicker.ts` — dropped `inspect()`. Serialize the picked element directly via `querySelector` + `__qlcSerialize`, pass through new `onPicked(element)` callback.
- `useSelectedElement.ts` — added `pushPicked(element)`. The override sticks until `$0` changes (user clicks a new DOM node), then live polling reclaims.
- `App.tsx` — wired `pushPicked` into `usePicker({ onPicked })`.
- `devtools.ts` — register the Elements sidebar pane **first** (shows alongside Styles/Computed), each registration wrapped in try/catch.
- `EmptyState.tsx` — added a "SnapLocator sub-tab inside Elements" hint for the "click DOM node → auto-update" flow.

---

## Phase 6 — local preview + download path

> **Prompt 16**
> "How do I download it, and can you give me the full path?"

Outcome: gave the absolute zip path (`/Users/promode/Documents/TTA/snaplocator/website/public/downloads/snaplocator-v0.7.0.zip`) plus "load unpacked from `extension/dist/`" instructions.

> **Prompt 17**
> "Can you host the website of SnapLocator and open it locally so that I can see that?"

Outcome: ran `vite dev` again, opened http://localhost:5173/.

> **Prompt 18**
> "Can you share with us the status of the agent which was researching?"

Outcome: clarified that no research agent was running, just the dev server.

---

## Phase 7 — competitor research (sub-agent)

> **Prompt 19**
> "Can you spawn a research agent which can basically check our competitors? We have **Competitor A** as well as **Competitor B**. Can you do thorough research? What are the missing features that we have?"

Outcome: spawned a background research sub-agent with WebFetch + WebSearch. The agent produced:
1. Feature-gap matrix grouped by category (recorder, AI, locator depth, workflow/UX, integrations, distribution) with each row tagged with which competitor has it and impact (high/med/low)
2. Honest list of SnapLocator's own differentiators
3. Pricing comparison
4. UX patterns worth adopting
5. Top-10 priority backlog ranked by impact-to-effort

---

## Phase 8 — parallel implementation

> **Prompt 20**
> "Start implementing all of them one by one, and let's spawn multiple agents to do that."

Outcome: spawned **4 parallel sub-agents** (single message, 4 `Agent` tool calls):

| Agent | Features | New files | Edits |
|---|---|---|---|
| **A** | Selenium 4 relative locators (`above/below/near/toLeftOf/toRightOf`); rating rationale tooltips | `lib/locators/relative.ts` | `types.ts`, `stability.ts`, `generate.ts`, `format.ts`, `StabilityBadge.tsx` |
| **B** | Freeze DOM mode; page-wide locator export | `content/freeze.ts`, `content/freeze.css`, `lib/export/pageExport.ts`, `components/ExportModal.tsx` | none |
| **C** | Test data generator (19 field types × realistic/edge/invalid columns × 8 rows) | `lib/testdata/generators.ts`, `lib/testdata/detect.ts`, `components/TestDataModal.tsx`, `components/TestDataModal.css` | none |
| **D** | Action recorder MVP (9-framework emit); inline attribute autosuggest in Test Locator bar | `content/recorder.ts`, `content/recorder.css`, `lib/recorder/{types,recorder}.ts`, `hooks/useRecorder.ts`, `components/RecorderPanel.tsx` | `components/TestLocator.tsx` |

Each agent had:
- A strict **file contract** (whitelist of files it could touch — everything else off-limits)
- A reminder of the **hard brand rule** (no third-party brand strings anywhere in code/comments/copy)
- A typecheck + build verification gate
- A report-back format

While the agents worked in parallel, the main thread integrated each result as it arrived:
- `scripts/build.mjs` — added `freeze.ts` + `recorder.ts` esbuild entries, copy CSS, copy `sidepanel.html`
- `LocatorRow.tsx` — extended `KIND_LABEL` with `rel-*` entries (cleaned up Agent A's exhaustiveness workaround)
- `format.ts` + `generate.ts` — added `rel-*` cases to every switch to satisfy TS exhaustiveness after merging `RelativeLocatorKind` into `LocatorKind`
- `protocol.ts` — added `FREEZE_TOGGLE` / `FREEZE_STATE` / `FREEZE_ENTER` / `FREEZE_EXIT` message types
- `manifest.json` — bumped to v0.8.0, added `contextMenus` + `sidePanel` permissions, registered `side_panel.default_path`, registered keyboard `commands` (`⌘⇧F` freeze, `⌘⇧R` record, `⌘⇧L` side panel)
- `service-worker.ts` — rewrote to handle two ports (`qlc-panel` for pick + freeze, `qlc-recorder` for action recorder), `chrome.commands.onCommand` listener, `chrome.contextMenus.onClicked` handler, `chrome.sidePanel.open` integration
- `content/freeze.ts` — added `FREEZE_STATE` broadcast on enter/exit so panel UI stays in sync
- new `hooks/useFreeze.ts` — panel-side hook for freeze state + toggle via `qlc-panel` port
- `Toolbar.tsx` — added Freeze / Record / Test data / Export page buttons
- `App.tsx` — wired all new hooks, modals, and keyboard shortcuts (`⌘⇧F/R/L/D/E/P/H`)
- new `extension/public/sidepanel.html` — Chrome Side Panel API surface (iframes `panel.html`)
- `website/src/lib/version.ts` + `extension/package.json` + `extension/public/manifest.json` — all bumped to 0.8.0

Final v0.8.0 build:
- Extension: typecheck clean, build clean, zip 98.0 KB at `website/public/downloads/snaplocator-v0.8.0.zip`
- Website: rebuilt (196 KB JS, 62 KB gzipped)
- Brand-grep: zero references to any third-party brand anywhere in code

---

## Phase 9 — ship

> **Prompt 21**
> "Continue from where you left off."

Outcome: confirmed v0.8.0 ship state, listed all delivered features, gave reload + test instructions.

> **Prompt 22** (this commit)
> "Push the code to https://github.com/PramodDutta/snaplocator and add a README.md file with diagram and create How_To_Create.md where you mention all the prompts I have given to you (remove competitor names — just say 'competitors')."

Outcome: this file you're reading, plus an updated `README.md` with two Mermaid diagrams (architecture + locator pipeline), plus a `git push` to the public GitHub repo.

---

## Patterns that worked

1. **Hard brand rule from prompt #1.** Every later sub-agent inherited "no third-party brand strings anywhere" as a non-negotiable. Zero compliance failures across hundreds of file edits.
2. **Strict file contracts for parallel agents.** Each of the 4 agents had a whitelist of files it could touch. Zero merge conflicts at integration time.
3. **Typecheck + build verification gate per agent.** Each agent had to report `npm run typecheck` and `npm run build` results before "done." Pre-existing errors flagged but not blamed.
4. **Versioned single source of truth.** Version lives in `extension/package.json` + `extension/public/manifest.json` + `website/src/lib/version.ts`. Bumped together at ship.
5. **Bug-fix discipline.** When the "panel disappears on pick" bug landed, the fix touched 5 files for one root cause (`inspect()` switching panels), not a workaround stack.
6. **Surface multiplexing.** Top panel + Elements sidebar pane + Side Panel API all driven by the same `panel.html` + `<App />` — three surfaces, one codebase, all sharing state via `Set<Port>` fan-out in the service worker.

## What didn't work / things to redo

- First attempt at the recorder used a single port shared with the picker — caused message confusion. Split into `qlc-panel` (pick + freeze) and `qlc-recorder` (recorder) ports.
- First freeze.ts tried to clone the entire DOM into a dialog overlay; abandoned because it broke live locator generation against the actual page. Final implementation uses event blockers + style overrides + `MutationObserver` revert.
- Agent A initially split `LocatorKind` into `LocatorKind | RelativeLocatorKind | AnyLocatorKind` to avoid touching `LocatorRow.tsx` (which had an exhaustive `Record<Candidate['kind'], string>` map). Main thread cleaned this up by merging the unions and adding the `rel-*` cases everywhere.

## Stack

- TypeScript, React 18, Vite 5, esbuild
- Chrome Extension Manifest V3 (devtools_page, side_panel, content_scripts, commands, contextMenus)
- Tailwind CSS (website only — extension uses plain CSS to keep the bundle small)
- No analytics, no telemetry, no third-party scripts anywhere

— Built with Claude Code.
