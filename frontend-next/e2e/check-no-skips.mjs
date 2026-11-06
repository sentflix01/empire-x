// Fails when a Playwright JSON report contains skipped tests (audit F-032).
// Specs skip themselves when seed data or settings are missing, which is
// right on a laptop but would hide broken setup in CI as a green run.
//   node e2e/check-no-skips.mjs <report.json>
import fs from 'node:fs';

const file = process.argv[2];
if (!file || !fs.existsSync(file)) { console.error(`No Playwright JSON report at ${file}`); process.exit(1); }
const report = JSON.parse(fs.readFileSync(file, 'utf8'));
const skipped = [];
const walk = (suite, titles) => {
  for (const child of suite.suites ?? []) walk(child, [...titles, child.title]);
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests) {
      if (test.results.some((r) => r.status === 'skipped')) {
        const why = (test.annotations ?? []).map((a) => a.description).filter(Boolean).join('; ');
        skipped.push(`${[...titles, spec.title].filter(Boolean).join(' › ')}${why ? ` — ${why}` : ''}`);
      }
    }
  }
};
walk(report, []);
const { expected = 0, unexpected = 0, flaky = 0 } = report.stats ?? {};
console.log(`E2E: ${expected} passed, ${unexpected} failed, ${flaky} flaky, ${skipped.length} skipped`);
if (skipped.length) {
  console.error('Skipped tests (fix the CI setup so they run):');
  for (const s of skipped) console.error(`  - ${s}`);
  process.exit(1);
}
