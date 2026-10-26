import { __qlcSerialize as serializeFn } from './serializeFn.js';
import type { SerializedElement } from './types';

/**
 * Serialize a DOM element into the `SerializedElement` shape the locator engine
 * consumes. Safe to call from a content script — no eval involved, so a strict
 * page CSP cannot block it.
 */
export function serializeElement(el: Element): SerializedElement {
  return (serializeFn(el) || null) as SerializedElement;
}

/**
 * The same serializer as injectable source, for the paths that must run in the
 * inspected page from the panel (`chrome.devtools.inspectedWindow.eval`).
 *
 * ONLY the function name is normalized, so injected snippets can call
 * `__qlcSerialize(...)`. The body is emitted verbatim: a minified panel build
 * renames parameters, so rewriting them here instead of consistently with the
 * body throws a ReferenceError inside the injected code.
 */
export const SERIALIZE_FN_SOURCE: string = toInjectableSource(serializeFn);

function toInjectableSource(fn: (el: Element) => unknown): string {
  const src = fn.toString().trim();
  if (/^function\b/.test(src)) {
    return src.replace(/^function\s*[A-Za-z0-9_$]*/, 'function __qlcSerialize');
  }
  return `const __qlcSerialize = ${src};`;
}
