export const IMPLICIT_ROLES: Record<string, string | ((el: { type?: string }) => string)> = {
  a: 'link',
  area: 'link',
  article: 'article',
  aside: 'complementary',
  body: 'document',
  button: 'button',
  datalist: 'listbox',
  dd: 'definition',
  details: 'group',
  dfn: 'term',
  dialog: 'dialog',
  dt: 'term',
  fieldset: 'group',
  figure: 'figure',
  footer: 'contentinfo',
  form: 'form',
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  h5: 'heading',
  h6: 'heading',
  header: 'banner',
  hr: 'separator',
  img: 'img',
  input: (el) => {
    const t = (el.type || 'text').toLowerCase();
    if (t === 'button' || t === 'submit' || t === 'reset' || t === 'image') return 'button';
    if (t === 'checkbox') return 'checkbox';
    if (t === 'radio') return 'radio';
    if (t === 'range') return 'slider';
    if (t === 'number') return 'spinbutton';
    if (t === 'search') return 'searchbox';
    if (t === 'email' || t === 'tel' || t === 'url' || t === 'password' || t === 'text') return 'textbox';
    return 'textbox';
  },
  li: 'listitem',
  main: 'main',
  math: 'math',
  menu: 'list',
  nav: 'navigation',
  ol: 'list',
  optgroup: 'group',
  option: 'option',
  output: 'status',
  progress: 'progressbar',
  section: 'region',
  select: 'combobox',
  summary: 'button',
  table: 'table',
  tbody: 'rowgroup',
  td: 'cell',
  textarea: 'textbox',
  tfoot: 'rowgroup',
  th: 'columnheader',
  thead: 'rowgroup',
  tr: 'row',
  ul: 'list',
};

export function inferRole(tag: string, attrs: Record<string, string>): string {
  const explicit = attrs.role;
  if (explicit) return explicit;
  const m = IMPLICIT_ROLES[tag.toLowerCase()];
  if (typeof m === 'function') return m({ type: attrs.type });
  return m || '';
}
