'use strict';

/** The Postgres-backed sign-in security store, against real SQL. */
const store = require('../../lib/authSecurityStore');
const { pool, tag } = require('./helpers');

const key = (name) => `dbtest:${name}:${tag()}`;

afterAll(async () => { await pool.query("DELETE FROM auth_security_state WHERE key LIKE 'dbtest:%' OR key LIKE 'revoked:dbtest-%' OR key LIKE 'revoke_before:dbtest-%'"); });

it('counts up and resets after the counter expires', async () => {
  const k = key('counter');
  expect(await store.incrementCounter(k, 60)).toBe(1);
  expect(await store.incrementCounter(k, 60)).toBe(2);
  await pool.query("UPDATE auth_security_state SET expires_at = NOW() - INTERVAL '1 second' WHERE key = $1", [k]);
  expect(await store.getValue(k)).toBeNull();
  expect(await store.incrementCounter(k, 60)).toBe(1);
});

it('stores, reads and clears values', async () => {
  const k = key('value');
  await store.setValue(k, 42, 60);
  expect(await store.getValue(k)).toBe(42);
  await store.clearValue(k);
  expect(await store.getValue(k)).toBeNull();
});

it('revokes one token and every token issued before a revoke-all', async () => {
  const jti = `dbtest-${tag()}`;
  const userId = `dbtest-${tag()}`;
  const nowSec = Math.floor(Date.now() / 1000);
  expect(await store.isTokenRevoked(jti, undefined, undefined)).toBe(false);
  await store.revokeTokenId(jti, nowSec + 600);
  expect(await store.isTokenRevoked(jti, undefined, undefined)).toBe(true);
  await store.revokeAllSessions(userId);
  expect(await store.isTokenRevoked(undefined, userId, nowSec - 10)).toBe(true);
  expect(await store.isTokenRevoked(undefined, userId, nowSec + 10)).toBe(false);
});

it('cleanup deletes only expired rows', async () => {
  const live = key('live'); const dead = key('dead');
  await store.setValue(live, 1, 600);
  await store.setValue(dead, 1, 600);
  await pool.query("UPDATE auth_security_state SET expires_at = NOW() - INTERVAL '1 second' WHERE key = $1", [dead]);
  await store.deleteExpiredAuthState();
  const { rows } = await pool.query('SELECT key FROM auth_security_state WHERE key = ANY($1)', [[live, dead]]);
  expect(rows.map((r) => r.key)).toEqual([live]);
});
