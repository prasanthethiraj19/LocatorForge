/**
 * Recorder emit check — takes the steps the real extension recorded in
 * `test/ext-e2e.mjs` (saved to pom-live/raw/recorder-steps.json) and runs them
 * through the panel's own emitters, exactly like the Recorder → "Test" /
 * "Page object" toggle does.
 *
 * Run: esbuild src/panel/lib/recorder/recorder.ts ... --outfile=test/pom-live/recorder.cjs
 *      esbuild src/panel/lib/locators/frameworks.ts ... --outfile=test/pom-live/frameworks.cjs
 *      node test/recorder-emit-check.mjs
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// The recorder module registers a content-script listener on import; stub the
// browser surface so it loads in Node without touching chrome APIs.
globalThis.window = { __qlcRecorderLoaded: true };

const { emitAll, buildTestFile, buildPomFile, defaultPomFilename } = require(join(here, 'pom-live', 'recorder.cjs'));
const { getFramework } = require(join(here, 'pom-live', 'frameworks.cjs'));

const raw = JSON.parse(await readFile(join(here, 'pom-live', 'raw', 'recorder-steps.json'), 'utf8'));
const steps = raw.map((s, i) => ({ id: `s${i + 1}`, pageKey: 'http://localhost:8123/index.html', ...s }));

const checks = [];
const check = (name, pass, detail) => {
  checks.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail === undefined ? '' : `  :: ${detail}`}`);
};

const fw = getFramework('playwright-ts');
const emitted = emitAll(steps, fw, 'data-testid');
const testCode = buildTestFile(steps, fw, 'data-testid');
const pomCode = buildPomFile(steps, fw, 'data-testid', 'IndexPage', 'http://localhost:8123/index.html');

check('steps received', steps.length > 0, `${steps.length} step(s): ${steps.map((s) => s.action).join(', ')}`);
check('every step emitted a locator', emitted.length === steps.length && emitted.every((e) => !!e.locatorExpression), emitted.map((e) => e.locatorExpression).join(' | '));
check('test file generated', /test\(|page\./.test(testCode), `${testCode.split('\n').length} lines`);
check('page object generated', /class IndexPage/.test(pomCode) && /Locator/.test(pomCode), `${pomCode.split('\n').length} lines`);
check('pom filename follows the class name', defaultPomFilename(fw, 'IndexPage') === 'IndexPage.ts', defaultPomFilename(fw, 'IndexPage'));

await mkdir(join(here, 'pom-live', 'output'), { recursive: true });
await writeFile(join(here, 'pom-live', 'output', 'recorder-recorded.spec.ts'), testCode, 'utf8');
await writeFile(join(here, 'pom-live', 'output', 'recorder-IndexPage.page.ts'), pomCode, 'utf8');

console.log('\n--- generated test ---');
console.log(testCode);
console.log('--- generated page object ---');
console.log(pomCode);

const failed = checks.filter((c) => !c.pass);
console.log(`${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);
