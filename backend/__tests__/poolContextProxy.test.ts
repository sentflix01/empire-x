/** @jest-environment node */

jest.unmock('../db/pool');

describe('request-scoped database pool facade', () => {
  const trackedKeys = ['DATABASE_URL', 'DEMO_DATABASE_URL', 'DATABASE_SCHEMA', 'DEMO_DB_SCHEMA'] as const;
  const originalValues = Object.fromEntries(trackedKeys.map((key) => [key, process.env[key]]));
  let poolModule: typeof import('../db/pool') | undefined;

  afterEach(async () => {
    await poolModule?.closeAllPools();
    for (const key of trackedKeys) {
      const value = originalValues[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    jest.resetModules();
    poolModule = undefined;
  });

  test('keeps exported helpers available when nested inside demo context', async () => {
    process.env.DATABASE_URL = 'postgresql://test:unused@127.0.0.1:5432/real_test';
    process.env.DEMO_DATABASE_URL = 'postgresql://test:unused@127.0.0.1:5433/demo_test';
    jest.resetModules();

    jest.isolateModules(() => {
      poolModule = require('../db/pool');
    });

    const contexts = poolModule!.runWithDatabaseEnvironment(
      { environment: 'demo', demoSessionId: 'session-test', demoUserId: 'demo-user-test' },
      () => {
        const demoEnvironment = poolModule!.getCurrentDatabaseEnvironment();
        const demoContext = poolModule!.getCurrentDatabaseContext();
        const nestedRealEnvironment = poolModule!.runWithDatabaseEnvironment(
          { environment: 'real' },
          () => poolModule!.getCurrentDatabaseEnvironment(),
        );
        const restoredDemoEnvironment = poolModule!.getCurrentDatabaseEnvironment();
        return { demoEnvironment, demoContext, nestedRealEnvironment, restoredDemoEnvironment };
      },
    );

    expect(contexts).toEqual({
      demoEnvironment: 'demo',
      demoContext: { environment: 'demo', demoSessionId: 'session-test', demoUserId: 'demo-user-test' },
      nestedRealEnvironment: 'real',
      restoredDemoEnvironment: 'demo',
    });
  });

  test('allows one physical database only with separate schemas and login roles', () => {
    process.env.DATABASE_URL = 'postgresql://real_app:unused@127.0.0.1:5432/shared_test';
    process.env.DEMO_DATABASE_URL = 'postgresql://demo_app:unused@127.0.0.1:5432/shared_test';
    process.env.DATABASE_SCHEMA = 'public';
    process.env.DEMO_DB_SCHEMA = 'demo';
    jest.resetModules();

    jest.isolateModules(() => {
      poolModule = require('../db/pool');
    });

    expect(() => poolModule!.runWithDatabaseEnvironment({ environment: 'demo' }, () => undefined)).not.toThrow();
    const options = poolModule!.runWithDatabaseEnvironment(
      { environment: 'demo' },
      () => (poolModule!.default as unknown as { options: { connectionString: string } }).options.connectionString,
    );
    expect(new URL(options).searchParams.get('options')).toBe('-c search_path=demo,pg_catalog');
  });

  test('rejects shared physical database when the Demo login role is not distinct', () => {
    process.env.DATABASE_URL = 'postgresql://postgres:unused@127.0.0.1:5432/shared_test';
    process.env.DEMO_DATABASE_URL = 'postgresql://postgres:unused@127.0.0.1:5432/shared_test';
    process.env.DATABASE_SCHEMA = 'public';
    process.env.DEMO_DB_SCHEMA = 'demo';
    jest.resetModules();

    jest.isolateModules(() => {
      poolModule = require('../db/pool');
    });

    expect(() => poolModule!.runWithDatabaseEnvironment({ environment: 'demo' }, () => undefined))
      .toThrow(/different schemas and different restricted database roles/);
  });
});
