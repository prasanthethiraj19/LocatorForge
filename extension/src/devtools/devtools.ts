// Sidebar pane inside Elements panel — registered first so users see it
// alongside Styles/Computed/Layout when they open DevTools.
// User can keep this open and click any element in the DOM tree — locators auto-populate via $0.
try {
  chrome.devtools.panels.elements.createSidebarPane('LocatorForge', (sidebar) => {
    sidebar.setPage('panel.html');
    sidebar.setHeight('600px');
  });
} catch (e) {
  console.warn('LocatorForge sidebar pane registration failed:', e);
}

// Top-level DevTools panel (sibling to Elements/Console/Network) for full-width workflow.
try {
  chrome.devtools.panels.create('LocatorForge', 'icons/icon-32.png', 'panel.html', () => {});
} catch (e) {
  console.warn('LocatorForge top panel registration failed:', e);
}
