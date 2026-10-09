const path = require('path');
const { spawnSync } = require('child_process');

describe('demo migration target safety', () => {
  test('refuses execution without an explicit opt-in and exact demo database name', () => {
    const script = path.join(__dirname, '../db/migrate-demo.js');
    const result = spawnSync(process.execPath, [script, '--execute', '--database=demo_db'], {
      encoding: 'utf8',
      timeout: 5_000,
      env: {
        ...process.env,
        DATABASE_URL: 'postgresql://user:pass@real.invalid:5432/real_db',
        DEMO_DATABASE_URL: 'postgresql://user:pass@demo.invalid:5432/demo_db',
        ALLOW_DEMO_MIGRATIONS: '',
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/ALLOW_DEMO_MIGRATIONS=1/);
    expect(result.stderr).toMatch(/exact demo database name/);
  });

  test('rejects shared physical database when schemas or restricted login roles are not isolated', () => {
    const script = path.join(__dirname, '../db/migrate-demo.js');
    const result = spawnSync(process.execPath, [script, '--execute', '--database=postgres', '--schema=demo'], {
      encoding: 'utf8',
      timeout: 5_000,
      env: {
        ...process.env,
        DATABASE_URL: 'postgresql://postgres:real@shared.invalid:5432/postgres',
        DEMO_DATABASE_URL: 'postgresql://postgres:demo@shared.invalid:5432/postgres',
        DATABASE_SCHEMA: 'public',
        DEMO_DB_SCHEMA: 'demo',
        ALLOW_DEMO_MIGRATIONS: '1',
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/different schemas and different restricted database roles/);
  });
});
