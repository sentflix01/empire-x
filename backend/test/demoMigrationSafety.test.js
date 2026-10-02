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
});
