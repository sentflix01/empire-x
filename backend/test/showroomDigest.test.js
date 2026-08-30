/** showroom-digests — pure helper tests (no DB / no email) */
const { isDue, buildDigestHtml, isNeonQuotaError } = require('../scripts/showroom-digests');

const report = {
  score: 62,
  grades: { completeness: 58, health: 81, freshness: 40 },
  sector: 'restaurant',
  findings: [
    { id: 'a', severity: 'critical', area: 'completeness', message: 'Menu section missing' },
    { id: 'b', severity: 'high', area: 'health', message: 'daily_specials failing 43%' },
    { id: 'c', severity: 'low', area: 'freshness', message: 'Stale 97 days' },
  ],
};

describe('isDue — weekly throttle', () => {
  test('due when never sent', () => {
    expect(isDue(null)).toBe(true);
  });
  test('not due within 7 days', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 864e5).toISOString();
    expect(isDue(threeDaysAgo)).toBe(false);
  });
  test('due after 7 days', () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 864e5).toISOString();
    expect(isDue(eightDaysAgo)).toBe(true);
  });
});

describe('buildDigestHtml', () => {
  const html = buildDigestHtml(report, 'Addis Kitchen', 'https://app.example/showroom/create?edit=s1');

  test('contains the score, sector and title', () => {
    expect(html).toContain('62');
    expect(html).toContain('restaurant');
    expect(html).toContain('Addis Kitchen');
  });
  test('renders top findings with severity colors', () => {
    expect(html).toContain('Menu section missing');
    expect(html).toContain('daily_specials failing 43%');
    expect(html).toContain('#dc2626'); // critical color
  });
  test('deep-links into the builder with the edit param', () => {
    expect(html).toContain('https://app.example/showroom/create?edit=s1');
  });
  test('positive case shows all-clear instead of findings', () => {
    const clean = buildDigestHtml({ ...report, findings: [] }, 'X', 'u');
    expect(clean).toContain('No issues found');
  });
});

describe('Neon quota guards', () => {
  test('detects Neon compute quota exhaustion in database errors', () => {
    expect(isNeonQuotaError(new Error('Your account or project has exceeded the compute time quota. Upgrade your plan to increase limits.'))).toBe(true);
    expect(isNeonQuotaError(new Error('connect ECONNREFUSED 127.0.0.1:5432'))).toBe(false);
  });
});

describe('pg_dump URL sanitization', () => {
  test('removes the pgbouncer parameter before invoking pg_dump', () => {
    const { stripPgbouncerParam } = require('../scripts/backup-database');
    const url = 'postgresql://user:pass@ep-foo.neon.tech/neondb?sslmode=require&pgbouncer=true';
    expect(stripPgbouncerParam(url)).toBe('postgresql://user:pass@ep-foo.neon.tech/neondb?sslmode=require');
  });
});
