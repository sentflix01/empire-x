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
