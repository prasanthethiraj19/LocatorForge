// Minimal chrome.devtools / chrome.runtime / chrome.storage stubs so the shipped
// panel bundle mounts in a plain page. Every eval() call the panel makes is
// recorded on window.__qlcEvalCalls so the test can run the exact injected code.
(function () {
  window.__qlcEvalCalls = [];

  function fakePort() {
    return {
      onMessage: { addListener() {}, removeListener() {} },
      onDisconnect: { addListener() {}, removeListener() {} },
      postMessage() {},
      disconnect() {},
    };
  }

  window.chrome = {
    runtime: {
      connect: fakePort,
      sendMessage: function () {
        return Promise.resolve();
      },
      onMessage: { addListener() {}, removeListener() {} },
      getURL: function (p) {
        return p;
      },
    },
    storage: {
      sync: {
        get: function (keys, cb) {
          if (cb) cb({});
        },
        set: function () {},
      },
      onChanged: { addListener() {}, removeListener() {} },
    },
    devtools: {
      inspectedWindow: {
        tabId: 1,
        eval: function (code, cb) {
          window.__qlcEvalCalls.push(code);
          if (cb) cb(code === 'location.href' ? location.href : null);
          return Promise.resolve(null);
        },
      },
      panels: { elements: { onSelectionChanged: { addListener() {}, removeListener() {} } } },
      network: { onNavigated: { addListener() {}, removeListener() {} } },
    },
  };
})();
