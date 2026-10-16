const { validateSeedEnvironment } = require('../db/seed');

describe('development seed safety', () => {
  const env = {
    DATABASE_URL: 'postgresql://user:secret@localhost:5432/nodbusiness_dev',
    NODE_ENV: 'development',
    ALLOW_DEV_SEED: '1',
    TEST_ACCOUNT_PASSWORD: 'unique-demo-password-2026',
  };

  it('accepts only a local dev database, explicit acknowledgement and unique passwords', () => {
    expect(() => validateSeedEnvironment(env)).not.toThrow();
    expect(() => validateSeedEnvironment({ ...env, DATABASE_URL: 'postgresql://hosted.example/db' })).toThrow(/non-local database/i);
    expect(() => validateSeedEnvironment({ ...env, NODE_ENV: 'production' })).toThrow(/production/i);
    expect(() => validateSeedEnvironment({ ...env, ALLOW_DEV_SEED: undefined })).toThrow(/ALLOW_DEV_SEED/i);
    expect(() => validateSeedEnvironment({ ...env, TEST_ACCOUNT_PASSWORD: 'Test1234!' })).toThrow(/TEST_ACCOUNT_PASSWORD/i);
  });
});
