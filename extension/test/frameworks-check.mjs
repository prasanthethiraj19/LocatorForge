/**
 * Framework matrix check — runs the per-page Page Object pipeline and the
 * recorder emitters across ALL 9 supported frameworks, using the elements
 * harvested from the real OrangeHRM site (test/pom-live/raw/) and the step the
 * real extension recorded (test/pom-live/raw/recorder-steps.json).
 *
 * Asserts, per framework: one class per page, no cross-page field leakage, and
 * a non-empty recorder test + page object. Writes every artifact to
 * test/pom-live/output/<framework>/.
 *
 * Usage: node test/frameworks-check.mjs
 */
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

globalThis.window = { __qlcRecorderLoaded: true };

const { generatePom } = require(join(here, 'pom-live', 'pom.cjs'));
const { suggestClassName, pageKeyFromUrl } = require(join(here, 'pom-live', 'naming.cjs'));
const { FRAMEWORKS, getFramework } = require(join(here, 'pom-live', 'frameworks.cjs'));
const { buildTestFile, buildPomFile } = require(join(here, 'pom-live', 'recorder.cjs'));

const EXT = {
  'playwright-ts': 'ts',
  'playwright-js': 'js',
  'playwright-py': 'py',
  'playwright-java': 'java',
  'selenium-java': 'java',
  'selenium-py': 'py',
  cypress: 'js',
  webdriverio: 'js',
  robot: 'robot',
};

const checks = [];
const check = (name, pass, detail) => {
  checks.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail === undefined ? '' : `  :: ${detail}`}`);
};

/** Identifier view: case- and separator-insensitive. */
const norm = (s) => String(s).replace(/[^A-Za-z0-9]/g, '').toLowerCase();

/**
 * A foreign field name is only meaningful evidence of leakage when it is
 * distinctive — camelCase/snake_case/punctuated. Bare lowercase words like
 * `link` or `row` are role names too, so matching those proves nothing.
 */
const isDistinctive = (f) => /[_A-Z]/.test(f) && norm(f).length >= 6;

const rawDir = join(here, 'pom-live', 'raw');
const files = (await readdir(rawDir)).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
const pages = [];
for (const f of files) {
  const p = JSON.parse(await readFile(join(rawDir, f), 'utf8'));
  if (!p.items || !p.capturedUrl) continue; // skip recorder steps / single-element fixtures
  pages.push({ url: p.capturedUrl, items: p.items, fields: p.items.map((i) => i.fieldName) });
}
pages.sort((a, b) => a.url.localeCompare(b.url));

const steps = JSON.parse(await readFile(join(rawDir, 'recorder-steps.json'), 'utf8'))
  .map((s, i) => ({ id: `s${i + 1}`, pageKey: 'http://localhost:8123/index.html', ...s }));

console.log(`pages: ${pages.length}, elements: ${pages.reduce((n, p) => n + p.items.length, 0)}, recorded steps: ${steps.length}\n`);

const rows = [];
for (const fw of FRAMEWORKS) {
  const dir = join(here, 'pom-live', 'output', fw.id);
  await mkdir(dir, { recursive: true });

  const classes = [];
  const missingFields = [];
  const leaks = [];
  let missing = 0;

  for (const page of pages) {
    const className = suggestClassName(page.url);
    const own = page.items.filter((i) => i.pageKey === pageKeyFromUrl(page.url));
    const code = generatePom(own, { className, framework: fw.id, url: page.url, packageName: 'com.example.pages' });
    const slug = new URL(page.url).pathname.split('/').filter(Boolean).slice(-2).join('-') || 'root';
    await writeFile(join(dir, `${slug}.page.${EXT[fw.id]}`), code, 'utf8');

    if (!code.includes(className)) missing++;
    classes.push(className);

    // Compare on a normalized identifier view: Python emits snake_case and Robot
    // emits ${UPPERCASE}, and role strings like "link" are not field references.
    const flat = norm(code);

    const absent = page.fields.filter((f) => !flat.includes(norm(f)));
    if (absent.length) missingFields.push(`${slug}: ${absent.join(', ')}`);

    const foreign = pages
      .filter((o) => o.url !== page.url)
      .flatMap((o) => o.fields)
      .filter((f) => !page.fields.includes(f))
      .filter((f) => isDistinctive(f));
    for (const f of new Set(foreign)) {
      if (flat.includes(norm(f))) leaks.push(`${slug} <- ${f}`);
    }
  }

  const testCode = buildTestFile(steps, fw, 'data-testid');
  const pomCode = buildPomFile(steps, fw, 'data-testid', 'IndexPage', 'http://localhost:8123/index.html');
  await writeFile(join(dir, `recorder.spec.${EXT[fw.id]}`), testCode, 'utf8');
  await writeFile(join(dir, 'IndexPage.page.txt'), pomCode, 'utf8');

  const distinct = new Set(classes).size === classes.length;
  check(`${fw.id}: class name emitted for every page`, missing === 0, `${classes.length} pages`);
  check(`${fw.id}: distinct class per page`, distinct, classes.join(', '));
  check(`${fw.id}: only this page's fields emitted`, leaks.length === 0, leaks.join(' ; ') || '0 foreign field reference(s)');
  check(`${fw.id}: every own field present in its class`, missingFields.length === 0, missingFields.join(' ; ') || `${pages.reduce((n, p) => n + p.fields.length, 0)} fields`);
  check(`${fw.id}: recorder test + page object emitted`, testCode.length > 40 && pomCode.length > 40, `${testCode.split('\n').length} / ${pomCode.split('\n').length} lines`);

  rows.push({ fw: fw.id, classes: classes.join(' | '), test: testCode.split('\n').length, pom: pomCode.split('\n').length });
}

console.log('\nframework            test lines  pom lines  classes');
for (const r of rows) console.log(`${r.fw.padEnd(20)} ${String(r.test).padStart(10)} ${String(r.pom).padStart(10)}  ${r.classes}`);

const failed = checks.filter((c) => !c.pass);
console.log(`\n${checks.length - failed.length}/${checks.length} framework checks passed across ${FRAMEWORKS.length} frameworks`);
process.exit(failed.length ? 1 : 0);
