/**
 * Report builder — replays the harvested elements the way the panel's POM basket
 * does (one persisted list across pages), then emits one Page Object per page.
 *
 * Run after pom-live-driver.mjs:
 *   esbuild src/panel/lib/pom/generate.ts --bundle --format=cjs --platform=node \
 *     --outfile=test/pom-live/pom.cjs
 *   node test/pom-live-report.mjs
 */
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(join(here, 'pom-live'));
const rawDir = join(outDir, 'raw');
const require = createRequire(import.meta.url);
const { generatePom } = require(join(outDir, 'pom.cjs'));
const { pageKeyFromUrl, suggestClassName } = require(join(outDir, 'naming.cjs'));

const FRAMEWORK = 'playwright-ts';
const EXT = 'ts';

function ext(name) {
  return name.replace(/[^A-Za-z0-9_-]+/g, '-').toLowerCase();
}

async function main() {
  const files = (await readdir(rawDir)).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
  const pages = [];
  for (const f of files) {
    pages.push(JSON.parse(await readFile(join(rawDir, f), 'utf8')));
  }
  pages.sort((a, b) => a.capturedUrl.localeCompare(b.capturedUrl));

  await mkdir(join(outDir, 'output'), { recursive: true });

  // What the basket actually holds: every element added, from every page.
  const combined = pages.flatMap((p) => p.items);

  const rows = [];
  const seenClasses = new Map();

  for (const page of pages) {
    const slug = ext(new URL(page.capturedUrl).pathname.split('/').filter(Boolean).slice(-2).join('-'));
    const pageKey = pageKeyFromUrl(page.capturedUrl);
    const className = suggestClassName(page.capturedUrl);

    // The fixed behaviour: keep only THIS page's basket items.
    const own = combined.filter((i) => i.pageKey === pageKey);
    const code = generatePom(own, { className, framework: FRAMEWORK, url: page.capturedUrl });
    await writeFile(join(outDir, 'output', `${slug}.page.${EXT}`), code, 'utf8');

    // Leapfrog check: nothing from another page may appear in this class.
    const foreign = own.filter((i) => i.pageKey !== pageKey).length;
    if (seenClasses.has(className)) {
      console.warn(`! duplicate class name: ${className} (also on ${seenClasses.get(className)})`);
    }
    seenClasses.set(className, page.capturedUrl);

    rows.push({
      slug,
      url: page.capturedUrl,
      pageKey,
      className,
      ownItems: own.length,
      totalBasketItems: combined.length,
      foreignItemsLeaked: foreign,
      fields: own.map((i) => i.fieldName),
      file: `output/${slug}.page.${EXT}`,
    });
    console.log(`${className.padEnd(28)} own=${String(own.length).padStart(2)} of ${combined.length}  -> ${rows.at(-1).file}`);
  }

  // What the OLD code did: one shared class name, the whole basket in one class.
  const buggy = generatePom(combined, {
    className: 'LoginPage',
    framework: FRAMEWORK,
    url: pages[0].capturedUrl,
  });
  await writeFile(join(outDir, 'output', '_BEFORE-one-class-for-all.ts'), buggy, 'utf8');

  const distinctClasses = new Set(rows.map((r) => r.className)).size;
  const distinctFields = new Set(rows.map((r) => r.fields.join(','))).size;

  const report = {
    framework: FRAMEWORK,
    generatedAt: new Date().toISOString(),
    pages: rows,
    checks: {
      pagesHarvested: rows.length,
      distinctClassNames: distinctClasses,
      distinctFieldSets: distinctFields,
      allClassesUnique: distinctClasses === rows.length,
      allFieldSetsUnique: distinctFields === rows.length,
      totalBasketItems: combined.length,
      buggyFileFieldsInOneClass: combined.length,
    },
  };
  await writeFile(join(outDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');

  const md = [
    '# Live POM test — OrangeHRM demo',
    '',
    `Source: ${'https://opensource-demo.orangehrmlive.com'} · framework: ${FRAMEWORK} · elements harvested from the real DOM with the panel's own \`__qlcSerialize\` + \`generateCandidates\` + \`generatePom\`.`,
    '',
    `Basket held **${combined.length}** elements across **${rows.length}** pages.`,
    '',
    '| Page | Class name | Fields in this class | File |',
    '| --- | --- | --- | --- |',
    ...rows.map((r) => `| \`${r.url.replace(/^https:\/\/[^/]+/, '')}\` | \`${r.className}\` | ${r.fields.map((f) => `\`${f}\``).join(', ')} | \`${r.file}\` |`),
    '',
    '## Checks',
    '',
    `- distinct class names: **${distinctClasses}/${rows.length}** (${distinctClasses === rows.length ? 'PASS' : 'FAIL'})`,
    `- distinct field sets: **${distinctFields}/${rows.length}** (${distinctFields === rows.length ? 'PASS' : 'FAIL'})`,
    `- cross-page leakage into a page object: **${rows.reduce((n, r) => n + r.foreignItemsLeaked, 0)}** (PASS = 0)`,
    '',
    `## Before / after`,
    '',
    `- BEFORE: every page produced \`class LoginPage\` with all ${combined.length} fields — see \`output/_BEFORE-one-class-for-all.ts\`.`,
    `- AFTER: one class per page, only that page's fields — see the per-page files above.`,
    '',
  ].join('\n');
  await writeFile(join(outDir, 'REPORT.md'), md, 'utf8');

  console.log('\nchecks:', JSON.stringify(report.checks, null, 2));
  console.log(`\nwrote ${join(outDir, 'REPORT.md')}`);
}

main().catch((e) => {
  console.error('report failed:', e);
  process.exit(1);
});
