/** showroomDoctor.ts — deterministic rule engine tests (Phase 1) */
const { diagnose } = require('../lib/showroomDoctor');

const base = {
  showroom: { id: 's1', title: 'Test', category: 'restaurant', status: 'published',
    cover_image: 'x.png', logo_url: 'l.png', updated_at: new Date().toISOString(), view_count: 10 },
  activeSections: ['menu', 'contact', 'location', 'about'],
  formData: { phone: '+251911', about: 'Best injera' },
  sourceStats: [],
  productCount: 5,
};

describe('diagnose()', () => {
  test('complete restaurant → high score, no critical findings', () => {
    const r = diagnose(base);
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.findings.filter(f => f.severity === 'critical')).toHaveLength(0);
    expect(r.sector).toBe('restaurant');
  });

  test('missing required menu section → critical finding with add_sections fix', () => {
    const r = diagnose({ ...base, activeSections: ['contact', 'location'] });
    const f = r.findings.find(x => x.id === 'missing_menu');
    expect(f).toBeTruthy();
    expect(f.severity).toBe('critical');
    expect(f.fix).toEqual({ type: 'add_sections', sections: ['menu'] });
  });

  test('no contact channel anywhere → critical', () => {
    const r = diagnose({ ...base, formData: {}, activeSections: ['menu'] });
    expect(r.findings.find(f => f.id === 'no_contact')?.severity).toBe('critical');
  });

  test('unknown category falls back to baseline (contact required)', () => {
    const r = diagnose({ ...base, showroom: { ...base.showroom, category: 'blacksmith' }, activeSections: [] });
    expect(r.sector).toBe('blacksmith');
    expect(r.findings.find(f => f.id === 'missing_contact')).toBeTruthy();
  });

  test('unhealthy external source escalates by failure ratio', () => {
    const r = diagnose({ ...base, sourceStats: [{ section_key: 'menu', attempts: 10, failures: 6, last_error: 'timeout' }] });
    const f = r.findings.find(x => x.id === 'source_unhealthy_menu');
    expect(f?.severity).toBe('high'); // 40% failure
    expect(f?.fix).toEqual({ type: 'recheck_source', sectionKey: 'menu' });
    expect(r.grades.health).toBeLessThan(100);
  });

  test('draft showroom flagged', () => {
    const r = diagnose({ ...base, showroom: { ...base.showroom, status: 'draft' } });
    expect(r.findings.find(f => f.id === 'draft_unpublished')).toBeTruthy();
  });

  test('stale content (>90 days) flagged low', () => {
    const r = diagnose({ ...base, showroom: { ...base.showroom, updated_at: new Date(Date.now() - 120 * 864e5).toISOString() } });
    expect(r.findings.find(f => f.id === 'stale_content')).toBeTruthy();
  });

  test('findings are sorted critical-first', () => {
    const r = diagnose({ ...base, formData: {}, activeSections: [] , productCount: 0 });
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    const sevs = r.findings.map(f => order[f.severity]);
    expect([...sevs].sort((a, b) => a - b)).toEqual(sevs);
  });

  test('score never escapes 0..100', () => {
    const disaster = diagnose({ ...base, formData: {}, activeSections: [], productCount: 0,
      showroom: { ...base.showroom, status: 'draft', cover_image: null, logo_url: null },
      sourceStats: [{ section_key: 'x', attempts: 10, failures: 10, last_error: 'dead' }] });
    expect(disaster.score).toBeGreaterThanOrEqual(0);
    expect(disaster.score).toBeLessThanOrEqual(100);
  });
});
