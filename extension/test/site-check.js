(function () {
  var T = window.__qlcTest;

  function shadowHostOf(node) {
    var r = node.getRootNode ? node.getRootNode() : null;
    return r && r.host ? r.host : null;
  }
  function bestSelectorForHost(host) {
    var id = host.id;
    if (id) {
      var root = host.getRootNode ? host.getRootNode() : null;
      var scope = root && root.host ? root : document;
      try { if (scope.querySelectorAll('#' + CSS.escape(id)).length === 1) return '#' + CSS.escape(id); } catch (e) {}
    }
    var ds = host.getAttribute('data-testid');
    if (ds) return '[data-testid=' + JSON.stringify(ds) + ']';
    return host.tagName.toLowerCase();
  }
  function buildShadowChain(node) {
    var chain = [], cur = node, s = 0;
    while (cur && s++ < 50) { var h = shadowHostOf(cur); if (!h) break; chain.unshift(bestSelectorForHost(h)); cur = h; }
    return chain;
  }
  function uniqueCssPath(node) {
    if (node.id && document.querySelectorAll('#' + CSS.escape(node.id)).length === 1) return '#' + CSS.escape(node.id);
    var parts = [], cur = node;
    while (cur && cur.nodeType === 1 && cur !== document.body) {
      var sel = cur.tagName.toLowerCase();
      if (cur.id && document.querySelectorAll('#' + CSS.escape(cur.id)).length === 1) { parts.unshift('#' + CSS.escape(cur.id)); return parts.join(' > '); }
      var p = cur.parentElement;
      if (p) { var sib = [].filter.call(p.children, function (c) { return c.tagName === cur.tagName; }); if (sib.length > 1) sel += ':nth-of-type(' + (sib.indexOf(cur) + 1) + ')'; }
      parts.unshift(sel); cur = p;
    }
    return parts.join(' > ') || node.tagName.toLowerCase();
  }
  function deepCssPath(node) {
    var chain = buildShadowChain(node);
    var inner = uniqueCssPath(node);
    return chain.length ? chain.concat([inner]).join(' >> ') : inner;
  }
  function resolveDeep(path) {
    var parts = path.split('>>').map(function (s) { return s.trim(); }).filter(Boolean);
    var root = document, node = null;
    for (var i = 0; i < parts.length; i++) {
      var found = root.querySelectorAll(parts[i]);
      if (!found.length) return null;
      node = found[0];
      if (i < parts.length - 1) root = node.shadowRoot || node;
    }
    return node;
  }

  var targets = [];
  (function walk(root) {
    root.querySelectorAll('button,input,select,textarea,a,[role=button],[role=link],[role=checkbox],[role=switch]').forEach(function (e) {
      if (e.getRootNode && e.getRootNode().host) targets.push(e);
    });
    root.querySelectorAll('*').forEach(function (h) { if (h.shadowRoot) walk(h.shadowRoot); });
  })(document);

  var out = [];
  targets.slice(0, 30).forEach(function (el, idx) {
    var pickPath = deepCssPath(el);
    var resolved = resolveDeep(pickPath);
    var r = T.run(el);
    if (!r.results.length) return;
    var best = r.results[0];
    var bestCount = -1, bestKindCount = {};
    r.results.forEach(function (c) {
      var n = 0; try { n = eval(c.countCode); } catch (e) { n = -1; }
      bestKindCount[c.kind] = n;
    });
    try { bestCount = eval(best.countCode); } catch (e) { bestCount = -1; }
    out.push({
      i: idx,
      tag: el.tagName.toLowerCase(),
      id: el.id || '',
      inShadow: r.serialized.inShadowRoot,
      shadowChain: r.serialized.shadowChain,
      pickPath: pickPath,
      pickResolved: resolved === el,
      bestKind: best.kind,
      bestExpr: best.expr,
      bestCount: bestCount,
      cnt: bestKindCount,
    });
  });

  var fails = out.filter(function (o) { return !o.pickResolved || o.bestCount !== 1 || o.shadowChain.length === 0; });
  return JSON.stringify({ total: out.length, fails: fails.length, results: out }, null, 2);
})()
