(function () {
  var T = window.__qlcTest;
  var results = [];
  var visited = [];

  function walk(win, depth) {
    var doc;
    try { doc = win.document; } catch (e) { return; }
    var els;
    try {
      els = doc.querySelectorAll('button,a,input,select,textarea,[role=button],[role=link]');
    } catch (e) { els = []; }
    Array.from(els).forEach(function (el) {
      if (results.length >= 60) return;
      var r;
      try { r = T.run(el); } catch (e) { return; }
      if (!r.results.length) return;
      var best = r.results[0];
      var c = -1;
      try { c = eval(best.countCode); } catch (e) { c = -2; }
      results.push({
        depth: depth,
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 24),
        chain: r.serialized.frameChain,
        chainLen: r.serialized.frameChain.length,
        frameLocators: (best.expr.match(/frameLocator/g) || []).length,
        best: best.kind,
        count: c,
        expr: best.expr.slice(0, 110),
      });
    });
    Array.from(win.frames).forEach(function (f) { walk(f, depth + 1); });
  }
  walk(window, 0);

  var deep = results.filter(function (x) { return x.depth > 0; });
  var bad = deep.filter(function (x) { return x.chainLen !== x.depth || x.frameLocators !== x.depth || x.count !== 1; });
  return JSON.stringify({
    url: location.href,
    total: results.length,
    inFrames: deep.length,
    badInFrames: bad.length,
    sample: results.slice(0, 40),
    bad: bad.slice(0, 20),
  }, null, 2);
})()
