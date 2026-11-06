const path = require('path');
const { discoverMigrationFiles, isExportedFunction } = require('../db/migrate-all');

describe('migration runner classification', () => {
  test('does not execute legacy migrations merely to identify them', () => {
    const legacy = path.join(__dirname, '../db/migrate.js');
    expect(isExportedFunction(legacy)).toBe(false);
  });

  test('recognizes exported migrations without executing them', () => {
    const exported = path.join(__dirname, '../db/migrate31.js');
    expect(isExportedFunction(exported)).toBe(true);
  });

  test('discovers the base migration before numbered migrations', () => {
    const migrations = discoverMigrationFiles();
    expect(migrations[0]).toBe('migrate.js');
    expect(migrations).toContain('migrate31.js');
  });
});

// ── Ledger planning (audit F-009) ─────────────────────────────────────────────
const { planMigrations, parseArgs, fileChecksum } = require('../db/migrate-all');

describe('migration ledger planning', () => {
  const files = ['migrate.js', 'migrate2.js', 'migrate3.js'];
  const sums = new Map([['migrate.js', 'a'], ['migrate2.js', 'b'], ['migrate3.js', 'c']]);

  it('runs only migrations that are not recorded', () => {
    const plan = planMigrations(files, sums, new Map([['migrate.js', 'a'], ['migrate2.js', 'b']]));
    expect(plan.run).toEqual([{ file: 'migrate3.js', reason: 'pending' }]);
    expect(plan.skipped).toEqual(['migrate.js', 'migrate2.js']);
  });

  it('runs everything on a database without records (first ledger deploy)', () => {
    expect(planMigrations(files, sums, new Map()).run.map((r) => r.file)).toEqual(files);
  });

  it('reports a recorded file whose text changed, unless --rerun names it', () => {
    const applied = new Map([['migrate.js', 'a'], ['migrate2.js', 'OLD'], ['migrate3.js', 'c']]);
    expect(planMigrations(files, sums, applied).changed).toEqual(['migrate2.js']);
    const plan = planMigrations(files, sums, applied, { rerun: ['migrate2.js'] });
    expect(plan.changed).toEqual([]);
    expect(plan.run).toEqual([{ file: 'migrate2.js', reason: 'changed' }]);
  });

  it('--all runs every file, recorded or not', () => {
    const plan = planMigrations(files, sums, new Map([['migrate.js', 'a']]), { all: true });
    expect(plan.run.map((r) => r.reason)).toEqual(['all', 'pending', 'pending']);
  });

  it('parses options and rejects unknown ones', () => {
    expect(parseArgs(['--rerun', 'migrate86.js', '--rerun=migrate2.js'])).toEqual({ all: false, status: false, rerun: ['migrate86.js', 'migrate2.js'] });
    expect(parseArgs(['--status']).status).toBe(true);
    expect(() => parseArgs(['--force'])).toThrow(/Unknown option/);
  });

  it('checksums ignore Windows line endings', () => {
    const fs = require('fs');
    const os = require('os');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mig-'));
    fs.writeFileSync(path.join(dir, 'a.js'), 'x\ny\n');
    fs.writeFileSync(path.join(dir, 'b.js'), 'x\r\ny\r\n');
    expect(fileChecksum(path.join(dir, 'a.js'))).toBe(fileChecksum(path.join(dir, 'b.js')));
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
