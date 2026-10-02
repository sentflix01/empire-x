/** @jest-environment node */

jest.unmock('../db/pool');

describe('request-scoped database pool facade', () => {
  const trackedKeys = ['DATABASE_URL', 'DEMO_DATABASE_URL'] as const;
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
});
