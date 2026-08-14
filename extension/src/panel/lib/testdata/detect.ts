/**
 * Detect the most likely TestDataType for a serialized element.
 *
 * Priority (first match wins):
 *   1. <select>          → 'select'
 *   2. <textarea>        → 'longText'
 *   3. <input type=email>→ 'email'
 *   4. <input type=tel>  OR name/placeholder matches /phone|mobile|tel/i → 'phone'
 *   5. <input type=date|datetime|datetime-local> → 'date'
 *   6. <input type=time> → 'time'
 *   7. <input type=number> → 'number'
 *   8. <input type=password> → 'password'
 *   9. <input type=url>  → 'url'
 *  10. text + name matches /first.?name/i  → 'firstName'
 *  11. text + name matches /last.?name|surname/i → 'lastName'
 *  12. text + name matches /full.?name|^name$/i → 'fullName'
 *  13. text + name matches /address|street/i → 'address'
 *  14. text + name matches /city/i → 'city'
 *  15. text + name matches /zip|postal/i → 'zipCode'
 *  16. text + name matches /country/i → 'country'
 *  17. text + name matches /card|credit/i → 'creditCard'
 *  18. fallthrough → 'genericText'
 */

import type { SerializedElement } from '../locators/types';
import type { TestDataType } from './generators';

function hayFor(el: SerializedElement): string {
  return [
    el.attrs.name,
    el.attrs.id,
    el.placeholder,
    el.labelText,
    el.ariaLabel,
    el.ariaLabelledByText,
    el.attrs['data-testid'],
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function detectType(el: SerializedElement | null): TestDataType {
  if (!el) return 'unknown';

  const tag = (el.tag || '').toLowerCase();

  // 1 — select
  if (tag === 'select') return 'select';

  // 2 — textarea
  if (tag === 'textarea') return 'longText';

  // Anything past here we treat as <input>-ish. If it's not an input or a
  // contenteditable surface, fall back to genericText after the name-based
  // checks so we still match e.g. <div role="textbox">.
  const type = (el.attrs.type || 'text').toLowerCase();
  const hay = hayFor(el);

  // 3
  if (type === 'email') return 'email';

  // 4 — type=tel OR name/placeholder hint
  if (type === 'tel') return 'phone';
  if (/\b(phone|mobile|tel|telephone|fax)\b/i.test(hay)) return 'phone';

  // 5
  if (type === 'date' || type === 'datetime' || type === 'datetime-local' || type === 'month' || type === 'week') {
    return 'date';
  }

  // 6
  if (type === 'time') return 'time';

  // 7
  if (type === 'number' || type === 'range') return 'number';

  // 8
  if (type === 'password') return 'password';

  // 9
  if (type === 'url') return 'url';

  // 10
  if (/first.?name|given.?name|fname/i.test(hay)) return 'firstName';

  // 11
  if (/last.?name|surname|family.?name|lname/i.test(hay)) return 'lastName';

  // 12
  if (/full.?name|\bname\b/i.test(hay)) return 'fullName';

  // 13
  if (/\b(address|street|addr|line[12])\b/i.test(hay)) return 'address';

  // 14
  if (/\bcity|town\b/i.test(hay)) return 'city';

  // 15
  if (/\b(zip|postal|postcode)\b/i.test(hay)) return 'zipCode';

  // 16
  if (/\bcountry\b/i.test(hay)) return 'country';

  // 17
  if (/\b(card|credit|cc.?number|cardnumber|pan)\b/i.test(hay)) return 'creditCard';

  // 18 — fallthrough
  return 'genericText';
}
