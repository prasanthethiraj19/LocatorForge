export const SERIALIZE_FN_SOURCE = `
function __qlcSerialize(el) {
  if (!el || el.nodeType !== 1) return null;

  function attrs(node) {
    var out = {};
    for (var i = 0; i < (node.attributes || []).length; i++) {
      var a = node.attributes[i];
      out[a.name] = a.value;
    }
    return out;
  }

  function isSvg(node) {
    return node && node.namespaceURI === 'http://www.w3.org/2000/svg';
  }

  function rootOf(node) {
    return node.getRootNode ? node.getRootNode() : null;
  }

  function shadowHostOf(node) {
    var r = rootOf(node);
    if (r && r !== document && r.host) return r.host;
    return null;
  }

  // Walks UP through shadow boundaries, building a chain of selectors representing each shadow host crossing.
  function buildShadowChain(node) {
    var chain = [];
    var cur = node;
    var safety = 0;
    while (cur && safety++ < 50) {
      var host = shadowHostOf(cur);
      if (!host) break;
      var hostSel = bestSelectorForHost(host);
      chain.unshift(hostSel);
      cur = host;
    }
    return chain;
  }

  function bestSelectorForHost(host) {
    if (host.id && hostHasUniqueId(host)) return '#' + CSS.escape(host.id);
    var ds = (host.dataset && host.dataset.testid) || host.getAttribute('data-testid');
    if (ds) return '[data-testid=' + JSON.stringify(ds) + ']';
    return host.tagName.toLowerCase();
  }

  function hostHasUniqueId(host) {
    try {
      var root = rootOf(host);
      var scope = (root === document || !root) ? document : (root.host && root.host.getRootNode && root.host.getRootNode());
      var d = (root === document || !root) ? document : root;
      return d.querySelectorAll('#' + CSS.escape(host.id)).length === 1;
    } catch (e) {
      return false;
    }
  }

  // Iframe / frame chain — only same-origin frames are walkable; cross-origin returns empty
  function buildFrameChain() {
    var chain = [];
    try {
      var w = window;
      var safety = 0;
      while (w !== w.parent && safety++ < 20) {
        var f = w.frameElement;
        if (!f) break;
        var sel = '';
        if (f.id) sel = '#' + CSS.escape(f.id);
        else if (f.name) sel = 'iframe[name=' + JSON.stringify(f.name) + ']';
        else sel = 'iframe';
        chain.unshift(sel);
        w = w.parent;
      }
    } catch (e) {
      chain.push('iframe');
    }
    return chain;
  }

  function getCss(node) {
    var parts = [];
    var cur = node;
    var safety = 0;
    while (cur && cur.nodeType === 1 && cur !== document.body && safety++ < 100) {
      if (shadowHostOf(cur)) break; // stop at shadow boundary; chain handles upper layer
      var s = cur.tagName.toLowerCase();
      if (cur.id && document.querySelectorAll('#' + CSS.escape(cur.id)).length === 1) {
        parts.unshift('#' + CSS.escape(cur.id));
        return parts.join(' > ');
      }
      var parent = cur.parentElement;
      if (parent) {
        var sib = Array.from(parent.children).filter(function (c) { return c.tagName === cur.tagName; });
        if (sib.length > 1) s += ':nth-of-type(' + (sib.indexOf(cur) + 1) + ')';
      }
      parts.unshift(s);
      cur = parent;
    }
    return parts.join(' > ') || node.tagName.toLowerCase();
  }

  function getXPathStructural(node) {
    if (node.id && document.querySelectorAll('[id=' + JSON.stringify(node.id) + ']').length === 1) {
      return '//*[@id=' + JSON.stringify(node.id) + ']';
    }
    var parts = [];
    var cur = node;
    var safety = 0;
    while (cur && cur.nodeType === 1 && safety++ < 100) {
      if (shadowHostOf(cur)) break;
      var parent = cur.parentNode;
      if (!parent || parent.nodeType !== 1) {
        parts.unshift(cur.tagName.toLowerCase());
        break;
      }
      var sib = Array.from(parent.children).filter(function (c) { return c.tagName === cur.tagName; });
      var idx = sib.indexOf(cur) + 1;
      parts.unshift(cur.tagName.toLowerCase() + (sib.length > 1 ? '[' + idx + ']' : ''));
      cur = parent;
    }
    return '//' + parts.join('/');
  }

  function getXPathAbsolute(node) {
    var parts = [];
    var cur = node;
    var safety = 0;
    while (cur && cur.nodeType === 1 && safety++ < 100) {
      if (shadowHostOf(cur)) break;
      var parent = cur.parentNode;
      if (!parent || parent.nodeType !== 1) {
        parts.unshift(cur.tagName.toLowerCase());
        break;
      }
      var sib = Array.from(parent.children).filter(function (c) { return c.tagName === cur.tagName; });
      var idx = sib.indexOf(cur) + 1;
      parts.unshift(cur.tagName.toLowerCase() + '[' + idx + ']');
      cur = parent;
    }
    return '/' + parts.join('/');
  }

  function getXPathPosition(node) {
    var parts = [];
    var cur = node;
    var safety = 0;
    while (cur && cur.nodeType === 1 && cur.tagName.toLowerCase() !== 'html' && safety++ < 100) {
      var parent = cur.parentNode;
      if (!parent || parent.nodeType !== 1) break;
      var idx = Array.prototype.indexOf.call(parent.children, cur) + 1;
      parts.unshift(cur.tagName.toLowerCase() + '[position()=' + idx + ']');
      cur = parent;
    }
    return '//' + parts.join('/');
  }

  function findAncestorAnchor(node) {
    var cur = node.parentElement;
    var safety = 0;
    while (cur && cur !== document.body && safety++ < 50) {
      if (cur.id && document.querySelectorAll('#' + CSS.escape(cur.id)).length === 1) {
        return { selector: '#' + CSS.escape(cur.id), tag: cur.tagName.toLowerCase() };
      }
      var role = cur.getAttribute && cur.getAttribute('role');
      if (role === 'main' || role === 'navigation' || role === 'form' || role === 'dialog') {
        return { selector: '[role=' + JSON.stringify(role) + ']', tag: cur.tagName.toLowerCase() };
      }
      var t = cur.tagName.toLowerCase();
      if (t === 'main' || t === 'nav' || t === 'form' || t === 'dialog' || t === 'header' || t === 'footer' || t === 'aside') {
        return { selector: t, tag: t };
      }
      cur = cur.parentElement;
    }
    return null;
  }

  function visibleTextOf(node) {
    return (node.textContent || '').replace(/\\s+/g, ' ').trim();
  }

  function findLabelText(node) {
    if (node.id) {
      var lab = document.querySelector('label[for=' + JSON.stringify(node.id) + ']');
      if (lab) return visibleTextOf(lab);
    }
    var p = node.parentElement;
    while (p) {
      if (p.tagName && p.tagName.toLowerCase() === 'label') return visibleTextOf(p);
      p = p.parentElement;
    }
    return '';
  }

  function ariaLabelledByText(node, a) {
    var ids = (a['aria-labelledby'] || '').split(/\\s+/).filter(Boolean);
    if (!ids.length) return '';
    return ids.map(function (id) {
      var r = document.getElementById(id);
      return r ? visibleTextOf(r) : '';
    }).filter(Boolean).join(' ');
  }

  var a = attrs(el);
  var tag = el.tagName.toLowerCase();
  var text = visibleTextOf(el);
  var directText = '';
  for (var j = 0; j < el.childNodes.length; j++) {
    var n = el.childNodes[j];
    if (n.nodeType === 3) directText += (n.textContent || '');
  }
  directText = directText.replace(/\\s+/g, ' ').trim();

  var testIds = {};
  var attrKeys = Object.keys(a);
  for (var k = 0; k < attrKeys.length; k++) {
    var key = attrKeys[k];
    if (/^data-(testid|test-id|qa|qa-id|cy|test)$/i.test(key)) testIds[key] = a[key];
  }

  var shadowChain = buildShadowChain(el);
  var frameChain = buildFrameChain();
  var anchor = findAncestorAnchor(el);
  var anchorOut = anchor ? { selector: anchor.selector, chain: anchor.selector } : null;

  return {
    tag: tag,
    attrs: a,
    textContent: text,
    visibleText: directText || text,
    alt: a.alt || '',
    title: a.title || '',
    placeholder: a.placeholder || '',
    ariaLabel: a['aria-label'] || '',
    ariaLabelledByText: ariaLabelledByText(el, a),
    labelText: findLabelText(el),
    role: a.role || '',
    testIds: testIds,
    cssPath: getCss(el),
    xpath: getXPathStructural(el),
    xpathAbsolute: getXPathAbsolute(el),
    xpathPosition: getXPathPosition(el),
    ancestorAnchor: anchorOut,
    shadowChain: shadowChain,
    frameChain: frameChain,
    isSvg: isSvg(el),
    inShadowRoot: shadowChain.length > 0,
    inIframe: frameChain.length > 0
  };
}
`;
