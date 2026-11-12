#!/usr/bin/env node
/**
 * Wave 3 — data export and account deletion journey, LOCAL ONLY.
 * Creates a throwaway user, uploads an avatar, exports, deletes, then checks
 * what remains reachable.
 *
 *   source ~/.nodbusiness-local/env.sh
 *   node note/2026-11-05-international-audit/scripts/account-lifecycle.mjs
 */
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'http://127.0.0.1:3001';
if (!/@(127\.0\.0\.1|localhost)[:/]/.test(process.env.DATABASE_URL ?? '')) throw new Error('Local database only');
const require = createRequire(join(dirname(fileURLToPath(import.meta.url)), '../../../backend/package.json'));
const bcrypt = require('bcryptjs');
const { Client } = require('pg');
const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

const email = `e2e-delete-${Date.now()}@example.test`;
const password = randomBytes(12).toString('hex');
const { rows: [u] } = await db.query(`INSERT INTO users (email, password_hash, full_name, is_verified) VALUES ($1,$2,'Delete Me',TRUE) RETURNING id`, [email, await bcrypt.hash(password, 10)]);

const call = async (method, path, token, body, form) => {
  const res = await fetch(API + path, { method, headers: { Origin: 'http://localhost:3002', ...(form ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: form ?? (body ? JSON.stringify(body) : undefined) });
  let data = null; try { data = await res.json(); } catch { /* empty */ }
  return { status: res.status, data };
};
const results = [];
const check = (name, ok, detail = {}) => results.push({ check: name, pass: Boolean(ok), ...detail });

const token = (await call('POST', '/api/auth/login', null, { email, password })).data?.access_token;
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const fd = new FormData(); fd.append('file', new Blob([png], { type: 'image/png' }), 'avatar.png');
const up = await call('POST', '/api/upload', token, null, fd);
const avatarUrl = up.data?.url;
const prof = await call('PUT', '/api/profiles/me/upsert', token, { display_name: 'Delete Me', avatar_url: avatarUrl });
check('setup: avatar uploaded and set', up.status === 200 && [200, 201].includes(prof.status), { upload: up.status, profile: prof.status });

const exp = await call('GET', '/api/auth/me/export', token);
const exported = JSON.stringify(exp.data ?? {});
check('export: self-service, machine-readable JSON', exp.status === 200 && exported.includes(email), { status: exp.status, top_level_keys: Object.keys(exp.data ?? {}).slice(0, 12) });
check('export: does not contain password hash, OTP or reset token', !/password_hash|otp_code|reset_token/.test(exported));

const delNoPw = await call('DELETE', '/api/auth/me', token, { confirm: 'DELETE' });
check('delete: requires the current password', delNoPw.status >= 400 && delNoPw.status < 500, { status: delNoPw.status });
const del = await call('DELETE', '/api/auth/me', token, { password, confirm: 'DELETE' });
check('delete: succeeds with password', del.status === 200, { status: del.status, error: del.data?.error });

const relogin = await call('POST', '/api/auth/login', null, { email, password });
check('after deletion: sign-in fails', relogin.status >= 400, { status: relogin.status });
const oldToken = await call('GET', '/api/auth/me', token);
check('after deletion: existing access token rejected', [401, 403].includes(oldToken.status), { status: oldToken.status });
const { rows: [after] } = await db.query('SELECT email, full_name, password_hash IS NULL AS no_password FROM users WHERE id=$1', [u.id]);
check('after deletion: users row anonymised (email and name removed)', after && after.email !== email && after.full_name !== 'Delete Me' && after.no_password, { email_changed: after?.email !== email, name_changed: after?.full_name !== 'Delete Me', password_cleared: after?.no_password });
const prof2 = await db.query('SELECT 1 FROM user_profiles WHERE user_id=$1', [u.id]);
check('after deletion: profile row removed', prof2.rowCount === 0, { remaining: prof2.rowCount });
const file = avatarUrl ? await fetch(avatarUrl) : null;
check('after deletion: uploaded avatar file is no longer served (GDPR Art. 17)', file && file.status === 404, { avatar_status_after_delete: file?.status });

await db.end();
console.log(JSON.stringify({ ran_at: new Date().toISOString(), results }, null, 2));
process.exit(results.some((r) => !r.pass) ? 1 : 0);
