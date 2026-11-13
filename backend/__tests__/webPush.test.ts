/**
 * web-push 4 is ES-module only. Production (Node 22.12+) loads it with
 * require(); Jest's own module loader cannot, so the real load is checked in
 * a plain Node child process, the way the server does it.
 */
import { spawnSync } from 'child_process';
import { join } from 'path';
import logger from '../lib/logger';
import { loadWebPush } from '../lib/webPush';

describe('loadWebPush', () => {
  const api = { setVapidDetails: jest.fn(), sendNotification: jest.fn() };
  let errorSpy: jest.SpyInstance;
  beforeEach(() => { errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => logger); });
  afterEach(() => errorSpy.mockRestore());

  it('returns the module when it has the push functions', () => {
    expect(loadWebPush(() => api)).toBe(api);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('accepts a module that only has a default export', () => {
    expect(loadWebPush(() => ({ default: api }))).toBe(api);
  });

  it('logs an error and returns null when loading fails', () => {
    expect(loadWebPush(() => { throw new Error('ERR_REQUIRE_ESM'); })).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith({ err: 'ERR_REQUIRE_ESM' }, expect.stringContaining('push notifications are off'));
  });

  it('logs an error and returns null when the functions are missing', () => {
    expect(loadWebPush(() => ({}))).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe('web-push in plain Node (as production loads it)', () => {
  it('requires, accepts VAPID keys and exposes sendNotification', () => {
    const script = `
      const w = require('web-push');
      const keys = w.generateVAPIDKeys();
      w.setVapidDetails('mailto:push-test@example.test', keys.publicKey, keys.privateKey);
      if (typeof w.sendNotification !== 'function') process.exit(2);
      console.log('ok');
    `;
    const run = spawnSync(process.execPath, ['-e', script], { cwd: join(__dirname, '..'), encoding: 'utf8' });
    expect(run.stderr).toBe('');
    expect(run.stdout.trim()).toBe('ok');
    expect(run.status).toBe(0);
  });
});
