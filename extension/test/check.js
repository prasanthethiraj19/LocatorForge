(function () {
  var T = window.__qlcTest;
  var out = { checks: [], data: {} };
  function chk(name, cond, detail) {
    out.checks.push({ name: name, pass: !!cond, detail: detail === undefined ? '' : detail });
  }
  function q(sel, root) { return (root || document).querySelector(sel); }
  function countsOf(res) {
    var best = 999;
    for (var i = 0; i < res.length; i++) {
      var n = 0;
      try { n = eval(res[i].countCode); } catch (e) { n = -1; }
      if (typeof n === 'number' && n > 0 && n < best) best = n;
    }
    return best;
  }

  var top = T.run(q('#top-btn'));
  out.data.top = { frameChain: top.serialized.frameChain, shadowChain: top.serialized.shadowChain, exprs: top.results.map(function (r) { return r.expr; }) };
  chk('top: no frame chain', top.serialized.frameChain.length === 0);
  chk('top: no shadow chain', top.serialized.shadowChain.length === 0);
  chk('top: locator generated', top.results.length > 0, top.results[0].expr);
  chk('top: live count > 0', countsOf(top.results) > 0, countsOf(top.results));

  var svg = T.run(q('#close-icon'));
  out.data.svg = { isSvg: svg.serialized.isSvg, kinds: svg.results.map(function (r) { return r.kind; }), exprs: svg.results.map(function (r) { return r.expr; }) };
  chk('svg: isSvg true', svg.serialized.isSvg === true);
  var svgCand = null;
  for (var i = 0; i < svg.results.length; i++) if (svg.results[i].kind === 'svg') svgCand = svg.results[i];
  chk('svg: svg locator present', !!svgCand, svgCand && svgCand.expr);
  chk('svg: anchored on unique id', !!svgCand && svgCand.expr === 'page.locator("#close-icon")', svgCand && svgCand.expr);
  chk('svg: live count > 0', countsOf(svg.results) > 0, countsOf(svg.results));

  var svg2 = T.run(document.querySelectorAll('svg')[1]);
  var svg2Cand = null;
  for (var k = 0; k < svg2.results.length; k++) if (svg2.results[k].kind === 'svg') svg2Cand = svg2.results[k];
  out.data.svg2 = { isSvg: svg2.serialized.isSvg, expr: svg2Cand && svg2Cand.expr };
  chk('svg (no id): anchored on aria-label', !!svg2Cand && /aria-label/.test(svg2Cand.expr), svg2Cand && svg2Cand.expr);
  chk('svg (no id): live count > 0', countsOf(svg2.results) > 0, countsOf(svg2.results));

  var host = q('#host');
  var sh = T.run(host.shadowRoot.querySelector('#shadow-btn'));
  out.data.shadow = { chain: sh.serialized.shadowChain, exprs: sh.results.map(function (r) { return r.expr; }) };
  chk('shadow: chain length 1', sh.serialized.shadowChain.length === 1, sh.serialized.shadowChain);
  chk('shadow: expr pierces shadow root', sh.results.some(function (r) { return /\.locator\(/.test(r.expr); }), sh.results[0] && sh.results[0].expr);
  chk('shadow: live count > 0', countsOf(sh.results) > 0, countsOf(sh.results));

  var host2 = host.shadowRoot.querySelector('#host2');
  var ns = T.run(host2.shadowRoot.querySelector('#deep-btn'));
  out.data.nestedShadow = { chain: ns.serialized.shadowChain, expr: ns.results[0] && ns.results[0].expr };
  chk('nested shadow: chain length 2', ns.serialized.shadowChain.length === 2, ns.serialized.shadowChain);
  chk('nested shadow: two .locator() wrappers', ns.results.some(function (r) { return (r.expr.match(/\.locator\(/g) || []).length >= 2; }), ns.results[0] && ns.results[0].expr);

  var outer = q('#outer');
  var od = outer.contentDocument;
  chk('frame: outer contentDocument reachable', !!od);
  var fb = T.run(od.querySelector('#frame-btn'));
  out.data.frame = { chain: fb.serialized.frameChain, exprs: fb.results.map(function (r) { return r.expr; }) };
  chk('frame: chain length 1', fb.serialized.frameChain.length === 1, fb.serialized.frameChain);
  chk('frame: expr has frameLocator', fb.results.some(function (r) { return /frameLocator/.test(r.expr); }), fb.results[0] && fb.results[0].expr);
  chk('frame: live count > 0', countsOf(fb.results) > 0, countsOf(fb.results));

  var inner = od.querySelector('#inner');
  var idoc = inner.contentDocument;
  chk('nested frame: inner contentDocument reachable', !!idoc);
  var nb = T.run(idoc.querySelector('#nested-btn'));
  out.data.nestedFrame = { chain: nb.serialized.frameChain, expr: nb.results[0] && nb.results[0].expr };
  chk('nested frame: chain length 2', nb.serialized.frameChain.length === 2, nb.serialized.frameChain);
  chk('nested frame: two frameLocator wrappers', nb.results.some(function (r) { return (r.expr.match(/frameLocator/g) || []).length === 2; }), nb.results[0] && nb.results[0].expr);
  chk('nested frame: live count > 0', countsOf(nb.results) > 0, countsOf(nb.results));

  out.pass = out.checks.every(function (c) { return c.pass; });
  return JSON.stringify(out, null, 2);
})()
