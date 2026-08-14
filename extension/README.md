# LocatorForge

Fast Chrome DevTools extension. Generates locators for Playwright, Selenium, Cypress, WebdriverIO, and Robot Framework — straight from any element on a page.

**No ads. No tracking. No BS. Just locators.**

Live at **locatorforge.com**.

## What it does

Adds a "LocatorForge" tab to Chrome DevTools (next to Elements, Console, Network) AND a sidebar pane inside the Elements panel (next to Styles, Computed, Layout, Event Listeners). Select any element, get every locator strategy ranked by stability:

- `getByRole`, `getByText`, `getByLabel`, `getByPlaceholder`, `getByAltText`, `getByTitle`, `getByTestId`
- By id, by name attribute
- Chained locator (scoped to nearest unique ancestor)
- Smart Patterns (parameterized templates for inputs)
- XPath axes (ancestor / following / preceding / sibling)
- CSS, structural xpath, absolute xpath, position xpath
- Shadow DOM + iframe auto-detection with `frameLocator()` wrap and `.or()` self-healing chains

Output supported in: **Playwright** (TS / JS / Python / Java), **Selenium** (Java / Python), **Cypress**, **WebdriverIO**, **Robot Framework**.

## Build

```bash
cd chrome-extension
npm install
npm run build       # produces dist/
npm run package     # zips dist/ → ../public/downloads/locatorforge-v{VERSION}.zip
```

## Install (unpacked)

1. Run `npm run build`
2. Open `chrome://extensions`
3. Toggle **Developer mode** (top right)
4. Click **Load unpacked**
5. Select the `chrome-extension/dist/` directory
6. Open any web page → F12 → click **LocatorForge** tab (or use the LocatorForge sidebar inside Elements panel)

## Develop

```bash
npm run dev         # Vite watch + rebuild on save
```

After each save, click the reload icon on the extension card in `chrome://extensions`.

## Privacy

- No telemetry
- No analytics
- No external network calls
- All data stays in `chrome.storage.sync` (your browser, your account)
- Open source

## License

Free for everyone.
