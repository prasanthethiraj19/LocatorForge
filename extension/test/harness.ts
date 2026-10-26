import { SERIALIZE_FN_SOURCE } from '../src/panel/lib/locators/serialize';
import { generateCandidates, sortCandidates, buildCountSnippet } from '../src/panel/lib/locators/generate';
import { formatExpression } from '../src/panel/lib/locators/format';
import { getFramework } from '../src/panel/lib/locators/frameworks';
import type { FrameworkId } from '../src/panel/lib/locators/types';

const serialize = new Function(`${SERIALIZE_FN_SOURCE}\nreturn __qlcSerialize;`)() as (el: Element) => Record<string, unknown>;

const OPTS = {
  testIdAttribute: 'data-testid',
  showSmartPatterns: true,
  showAxes: true,
  selfHealing: false,
};

function run(el: Element, fw: FrameworkId = 'playwright-ts') {
  const serialized = serialize(el);
  const candidates = sortCandidates(generateCandidates(serialized as never, OPTS));
  const framework = getFramework(fw);
  return {
    serialized,
    results: candidates.slice(0, 10).map((c) => ({
      kind: c.kind,
      section: c.section,
      expr: formatExpression(c, { framework }),
      countCode: buildCountSnippet(c, OPTS),
    })),
  };
}

(window as unknown as { __qlcTest: unknown }).__qlcTest = { run };
