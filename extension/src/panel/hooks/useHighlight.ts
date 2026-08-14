import { useCallback } from 'react';
import type { Candidate } from '../lib/locators/types';
import { buildCountSnippet } from '../lib/locators/generate';

export function useHighlight(testIdAttribute: string) {
  const flash = useCallback(
    (c: Candidate) => {
      const countExpr = buildCountSnippet(c, { testIdAttribute, showSmartPatterns: true, showAxes: true, selfHealing: false });
      const code = `
        (function(){
          var prev = document.querySelectorAll('[data-qlc-flash]');
          prev.forEach(function(p){ p.removeAttribute('data-qlc-flash'); p.style.outline=''; p.style.boxShadow=''; });
          try {
            var matches = (function(){
              ${snippetSelector(c, testIdAttribute)}
            })();
            matches.forEach(function(m){
              m.setAttribute('data-qlc-flash','1');
              m.style.outline='2px solid #10b981';
              m.style.boxShadow='0 0 0 4px rgba(16,185,129,0.25)';
              m.style.transition='outline 200ms, box-shadow 200ms';
            });
            if (matches[0]) matches[0].scrollIntoView({behavior:'smooth', block:'center'});
            setTimeout(function(){
              matches.forEach(function(m){
                m.removeAttribute('data-qlc-flash');
                m.style.outline='';
                m.style.boxShadow='';
              });
            }, 1800);
            return matches.length;
          } catch(e){ return 0; }
        })();
        ${countExpr}
      `;
      try {
        chrome.devtools.inspectedWindow.eval(code);
      } catch {}
    },
    [testIdAttribute],
  );

  return { flash };
}

function snippetSelector(c: Candidate, testIdAttr: string): string {
  switch (c.kind) {
    case 'role':
      return `var sel='${roleSelectorFor(c.args.role || '')}';return Array.from(document.querySelectorAll(sel));`;
    case 'text':
      return `var q=${JSON.stringify((c.args.value || '').toLowerCase())};return Array.from(document.querySelectorAll('*')).filter(function(e){var t='';e.childNodes.forEach(function(c){if(c.nodeType===3)t+=c.textContent||''});return t.replace(/\\s+/g,' ').trim().toLowerCase().indexOf(q)!==-1;});`;
    case 'label':
      return `var q=${JSON.stringify((c.args.value || '').toLowerCase())};var out=[];Array.from(document.querySelectorAll('label')).forEach(function(l){var t=(l.textContent||'').replace(/\\s+/g,' ').trim().toLowerCase();if(t.indexOf(q)===-1)return;var f=l.getAttribute('for');if(f){var x=document.getElementById(f);if(x)out.push(x)}else{var inp=l.querySelector('input,textarea,select');if(inp)out.push(inp)}});return out;`;
    case 'placeholder':
    case 'altText':
    case 'title':
    case 'name': {
      const attr = c.kind === 'altText' ? 'alt' : c.kind;
      return `return Array.from(document.querySelectorAll('['+${JSON.stringify(attr)}+'='+JSON.stringify(${JSON.stringify(c.args.value || '')})+']'));`;
    }
    case 'testid':
      return `return Array.from(document.querySelectorAll('['+${JSON.stringify(c.args.attr || testIdAttr)}+'='+JSON.stringify(${JSON.stringify(c.args.value || '')})+']'));`;
    case 'id':
    case 'smart-id':
      return `try{return Array.from(document.querySelectorAll('#'+CSS.escape(${JSON.stringify(c.args.value || '')})));}catch(e){return [];}`;
    case 'css':
      return `try{return Array.from(document.querySelectorAll(${JSON.stringify(c.cssOrXPath || '')}));}catch(e){return [];}`;
    case 'xpath':
    case 'xpathAbs':
    case 'xpathPos': {
      return `try{var r=document.evaluate(${JSON.stringify(c.cssOrXPath || '')},document,null,XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,null);var out=[];for(var i=0;i<r.snapshotLength;i++)out.push(r.snapshotItem(i));return out;}catch(e){return [];}`;
    }
    case 'chained': {
      const a = c.args.anchor || '';
      if (c.args.label) {
        return `var out=[];document.querySelectorAll(${JSON.stringify(a)}).forEach(function(scope){scope.querySelectorAll('label').forEach(function(l){if((l.textContent||'').replace(/\\s+/g,' ').trim()===${JSON.stringify(c.args.label)}){var f=l.getAttribute('for');if(f){var x=scope.querySelector('#'+CSS.escape(f));if(x)out.push(x)}else{var inp=l.querySelector('input,textarea,select');if(inp)out.push(inp)}}})});return out;`;
      }
      return `var out=[];document.querySelectorAll(${JSON.stringify(a)}).forEach(function(scope){out.push.apply(out,Array.from(scope.querySelectorAll(${JSON.stringify(c.args.descendant || '')})))});return out;`;
    }
    case 'smart-placeholder':
      return c.args.variant === 'example' ? `return Array.from(document.querySelectorAll('[placeholder='+JSON.stringify(${JSON.stringify(c.args.value || '')})+']'));` : 'return [];';
    case 'smart-name':
      return c.args.variant === 'example' ? `return Array.from(document.querySelectorAll('[name='+JSON.stringify(${JSON.stringify(c.args.value || '')})+']'));` : 'return [];';
    case 'smart-label':
      return c.args.variant === 'example'
        ? `var q=${JSON.stringify(c.args.value || '')};var out=[];document.querySelectorAll('label').forEach(function(l){if((l.textContent||'').replace(/\\s+/g,' ').trim()===q){var f=l.getAttribute('for');if(f){var x=document.getElementById(f);if(x)out.push(x)}else{var inp=l.querySelector('input,textarea,select');if(inp)out.push(inp)}}});return out;`
        : 'return [];';
    case 'axis-ancestor':
    case 'axis-following':
    case 'axis-preceding':
    case 'axis-followingSibling':
    case 'axis-precedingSibling':
    case 'axis-parent':
      return `try{var r=document.evaluate(${JSON.stringify(c.cssOrXPath || '')},document,null,XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,null);var out=[];for(var i=0;i<r.snapshotLength;i++)out.push(r.snapshotItem(i));return out;}catch(e){return [];}`;
  }
  return 'return [];';
}

function roleSelectorFor(role: string): string {
  const map: Record<string, string> = {
    button: 'button,input[type=button],input[type=submit],input[type=reset],input[type=image],[role=button]',
    link: 'a[href],[role=link]',
    textbox: 'input:not([type=button]):not([type=submit]):not([type=reset]):not([type=checkbox]):not([type=radio]):not([type=image]):not([type=range]):not([type=number]):not([type=search]),textarea,[role=textbox]',
    checkbox: 'input[type=checkbox],[role=checkbox]',
    radio: 'input[type=radio],[role=radio]',
    heading: 'h1,h2,h3,h4,h5,h6,[role=heading]',
    img: 'img,[role=img]',
    list: 'ul,ol,menu,[role=list]',
    listitem: 'li,[role=listitem]',
  };
  return map[role] || `[role=${role}]`;
}
