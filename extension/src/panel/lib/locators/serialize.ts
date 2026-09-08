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

  function isUniqueSel(sel) {
    try { return document.querySelectorAll(sel).length === 1; } catch (e) { return false; }
  }

  /**
   * Finds the closest ancestor within which the given text is unique, and
   * returns a selector for that ancestor that is GLOBALLY unique on the page.
   * Prefers a stable, readable anchor (unique #id or a landmark whose tag
   * selector is unique), otherwise falls back to a full structural CSS path
   * (the same guaranteed-unique path used by the css fallback candidate).
   */
  function findClosestUniqueAnchor(node, text) {
    if (!text) return null;
    var targetText = text.toLowerCase().trim();
    if (!targetText) return null;

    function textMatchesWithin(cur) {
      var matches = 0;
      var children = cur.querySelectorAll('*');
      for (var i = 0; i < children.length; i++) {
        var el = children[i];
        var dt = '';
        var cn = el.childNodes;
        for (var j = 0; j < cn.length; j++) {
          if (cn[j].nodeType === 3) dt += cn[j].textContent || '';
        }
        dt = dt.replace(/\\s+/g, ' ').trim().toLowerCase();
        if (dt === targetText) {
          matches++;
          if (matches > 1) return matches;
        }
      }
      return matches;
    }

    var cur = node.parentElement;
    var safety = 0;
    while (cur && cur !== document.body && safety++ < 50) {
      if (textMatchesWithin(cur) === 1) {
        var sel = '';
        var tag = cur.tagName.toLowerCase();
        if (cur.id && isUniqueSel('#' + CSS.escape(cur.id))) {
          sel = '#' + CSS.escape(cur.id);
        } else {
          var role = cur.getAttribute && cur.getAttribute('role');
          var landmarkTag = tag === 'main' || tag === 'nav' || tag === 'form' || tag === 'header' || tag === 'footer' || tag === 'aside';
          var landmarkRole = role === 'main' || role === 'navigation' || role === 'form' || role === 'dialog';
          if (landmarkTag && isUniqueSel(tag)) {
            sel = tag;
          } else if (landmarkRole && isUniqueSel('[role=' + JSON.stringify(role) + ']')) {
            sel = '[role=' + JSON.stringify(role) + ']';
          } else {
            // Guaranteed-unique structural path ending at this container.
            var path = getCss(cur);
            if (path) sel = path;
          }
        }
        if (sel) return { selector: sel, xpath: getXPathStructural(cur), tag: tag };
      }
      cur = cur.parentElement;
    }
    return null;
  }

  function visibleTextOf(node) {
    return (node.textContent || '').replace(/\\s+/g, ' ').trim();
  }

  // Direct-text normalization used to reproduce getByText exact matching.
  function directTextOf(node) {
    var dt = '';
    for (var j = 0; j < node.childNodes.length; j++) {
      var cn = node.childNodes[j];
      if (cn.nodeType === 3) dt += cn.textContent || '';
    }
    return dt.replace(/\\s+/g, ' ').trim();
  }

  // Reproduces the selector fallback for a given implicit/explicit role so we
  // can locate the same elements Playwright's role selector would match.
  function roleSelectorFor(role) {
    var map = {
      button: 'button,input[type=button],input[type=submit],input[type=reset],input[type=image],[role=button]',
      link: 'a[href],[role=link]',
      textbox: 'input:not([type=button]):not([type=submit]):not([type=reset]):not([type=checkbox]):not([type=radio]):not([type=image]):not([type=range]):not([type=number]):not([type=search]),textarea,[role=textbox]',
      checkbox: 'input[type=checkbox],[role=checkbox]',
      radio: 'input[type=radio],[role=radio]',
      searchbox: 'input[type=search],[role=searchbox]',
      combobox: 'select,[role=combobox]',
      heading: 'h1,h2,h3,h4,h5,h6,[role=heading]',
      img: 'img,[role=img]',
      list: 'ul,ol,menu,[role=list]',
      listitem: 'li,[role=listitem]',
      dialog: 'dialog,[role=dialog]',
      tab: '[role=tab]',
      tabpanel: '[role=tabpanel]',
      navigation: 'nav,[role=navigation]',
      main: 'main,[role=main]',
      banner: 'header,[role=banner]',
      contentinfo: 'footer,[role=contentinfo]',
      form: 'form,[role=form]',
      region: 'section,[role=region]',
      table: 'table,[role=table]',
      row: 'tr,[role=row]',
      cell: 'td,[role=cell]',
      columnheader: 'th,[role=columnheader]',
      option: 'option,[role=option]',
      slider: 'input[type=range],[role=slider]',
      spinbutton: 'input[type=number],[role=spinbutton]',
      progressbar: 'progress,[role=progressbar]',
      separator: 'hr,[role=separator]'
    };
    return map[role] || '[role=' + JSON.stringify(role) + ']';
  }

  // Rough accessible-name proxy matching the panel's computeAccessibleName:
  // aria-labelledby text → aria-label → label text → img alt → input value/placeholder → own visible text.
  function elementNameFor(node, a) {
    if (!a) a = attrs(node);
    var labelledby = (a['aria-labelledby'] || '').split(/\\s+/).filter(Boolean);
    if (labelledby.length) {
      var parts = labelledby.map(function (id) {
        var r = document.getElementById(id);
        return r ? visibleTextOf(r) : '';
      }).filter(Boolean);
      if (parts.length) return parts.join(' ').replace(/\\s+/g, ' ').trim();
    }
    if (a['aria-label']) return String(a['aria-label']).replace(/\\s+/g, ' ').trim();
    var lab = findLabelText(node);
    if (lab) return lab;
    var t = node.tagName.toLowerCase();
    if (t === 'img' && a.alt) return String(a.alt).replace(/\\s+/g, ' ').trim();
    if (t === 'input') {
      var it = (a.type || 'text').toLowerCase();
      if (it === 'submit' || it === 'reset' || it === 'button') return String(a.value || '').replace(/\\s+/g, ' ').trim();
      if (it === 'image') return String(a.alt || '').replace(/\\s+/g, ' ').trim();
      if (a.placeholder) return String(a.placeholder).replace(/\\s+/g, ' ').trim();
      return '';
    }
    if (t === 'button' || /^h[1-6]$/.test(t) || t === 'a' || t === 'summary') {
      var vis = (node.textContent || '').replace(/\\s+/g, ' ').trim();
      return vis;
    }
    if (a.title) return String(a.title).replace(/\\s+/g, ' ').trim();
    return '';
  }

  // 0-based index of el among all elements matching role+name in document order.
  function roleMatchIndex(el, role, name, a) {
    try {
      var sel = roleSelectorFor(role);
      var all = document.querySelectorAll(sel);
      var idx = 0;
      for (var i = 0; i < all.length; i++) {
        if (!name) {
          if (all[i] === el) return idx;
          idx++;
          continue;
        }
        var nm = elementNameFor(all[i]);
        if (nm === name) {
          if (all[i] === el) return idx;
          idx++;
        }
      }
      return -1;
    } catch (e) { return -1; }
  }

  // 0-based index of el among all elements whose exact direct text equals text.
  function textMatchIndex(el, text) {
    try {
      var all = document.querySelectorAll('*');
      var idx = 0;
      for (var i = 0; i < all.length; i++) {
        var dt = directTextOf(all[i]);
        if (dt && dt === text) {
          if (all[i] === el) return idx;
          idx++;
        }
      }
      return -1;
    } catch (e) { return -1; }
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
  var uniqueTextAnchor = findClosestUniqueAnchor(el, directText || text);
  var uniqueAnchorOut = uniqueTextAnchor ? { selector: uniqueTextAnchor.selector, xpath: uniqueTextAnchor.xpath, chain: uniqueTextAnchor.selector } : null;

  // Match indexes (0-based) so we can emit .nth(k) disambiguators that the
  // Playwright "other locators" guide recommends when several elements share
  // the same role/text.
  var explicitRole = a.role || '';
  var inferredRole = '';
  var tagn = tag;
  if (tagn === 'a') inferredRole = 'link';
  else if (tagn === 'button') inferredRole = 'button';
  else if (tagn === 'img') inferredRole = 'img';
  else if (tagn === 'input') {
    var it2 = (a.type || 'text').toLowerCase();
    if (it2 === 'button' || it2 === 'submit' || it2 === 'reset' || it2 === 'image') inferredRole = 'button';
    else if (it2 === 'checkbox') inferredRole = 'checkbox';
    else if (it2 === 'radio') inferredRole = 'radio';
    else if (it2 === 'search') inferredRole = 'searchbox';
    else if (it2 === 'number') inferredRole = 'spinbutton';
    else inferredRole = 'textbox';
  }
  else if (/^h[1-6]$/.test(tagn)) inferredRole = 'heading';
  else if (tagn === 'select') inferredRole = 'combobox';
  else if (tagn === 'textarea') inferredRole = 'textbox';
  else if (tagn === 'nav') inferredRole = 'navigation';
  else if (tagn === 'main') inferredRole = 'main';
  else if (tagn === 'header') inferredRole = 'banner';
  else if (tagn === 'footer') inferredRole = 'contentinfo';
  else if (tagn === 'form') inferredRole = 'form';
  else if (tagn === 'table') inferredRole = 'table';
  else if (tagn === 'tr') inferredRole = 'row';
  else if (tagn === 'td') inferredRole = 'cell';
  else if (tagn === 'th') inferredRole = 'columnheader';
  else if (tagn === 'li') inferredRole = 'listitem';
  else if (tagn === 'ul' || tagn === 'ol') inferredRole = 'list';
  else if (tagn === 'option') inferredRole = 'option';
  else if (tagn === 'section') inferredRole = 'region';
  else if (tagn === 'aside') inferredRole = 'complementary';
  else if (tagn === 'dialog') inferredRole = 'dialog';

  var finalRole = explicitRole || inferredRole;
  var accessName = elementNameFor(el, a);
  var cleanText = directText || text;
  var roleIdx = finalRole && accessName ? roleMatchIndex(el, finalRole, accessName, a) : -1;
  var roleNoNameIdx = finalRole ? roleMatchIndex(el, finalRole, '', a) : -1;
  var textIdx = cleanText ? textMatchIndex(el, cleanText) : -1;

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
    uniqueTextAnchor: uniqueAnchorOut,
    roleIndex: roleIdx,
    roleNoNameIndex: roleNoNameIdx,
    textIndex: textIdx,
    shadowChain: shadowChain,
    frameChain: frameChain,
    isSvg: isSvg(el),
    inShadowRoot: shadowChain.length > 0,
    inIframe: frameChain.length > 0
  };
}
`;
