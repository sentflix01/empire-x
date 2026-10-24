/**
 * The E2E suite writes data, so its setup refuses any target that isn't on
 * this machine (audit DATA-03: test listings ended up on the live marketplace).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { e2eTargetProblem } from '../e2e/target-guard';

let dir = '';
const envFile = (contents: string) => {
  const file = path.join(dir, `env-${Math.random().toString(36).slice(2)}`);
  fs.writeFileSync(file, contents);
  return file;
};

beforeAll(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-guard-')); });
afterAll(() => { fs.rmSync(dir, { recursive: true, force: true }); });

describe('E2E target guard', () => {
  it('refuses a backend/.env that points at a hosted database', () => {
    const file = envFile('JWT_SECRET=x\nDATABASE_URL=postgresql://postgres.ref:secret@aws-0-eu.pooler.supabase.com:6543/postgres\n');
    expect(e2eTargetProblem({}, file)).toMatch(/aws-0-eu\.pooler\.supabase\.com/);
  });

  it('refuses a remote backend URL even when the backend is started elsewhere', () => {
    const problem = e2eTargetProblem({ E2E_BACKEND_URL: 'https://nodbusiness-backend-9psf.onrender.com', E2E_SKIP_BACKEND: 'true' });
    expect(problem).toMatch(/onrender\.com/);
  });

  it('uses DATABASE_URL from the environment before backend/.env, as the backend does', () => {
    const file = envFile('DATABASE_URL=postgres://u:p@localhost:5432/dev\n');
    expect(e2eTargetProblem({ DATABASE_URL: 'postgres://u:p@db.example.com:5432/prod' }, file)).toMatch(/db\.example\.com/);
  });

  it('allows a local database, the docker-compose service and a quoted value', () => {
    expect(e2eTargetProblem({}, envFile('DATABASE_URL=postgresql://postgres:pw@localhost:5432/nodbusiness\n'))).toBeNull();
    expect(e2eTargetProblem({}, envFile('DATABASE_URL="postgresql://nodbusiness:dev@postgres:5432/nodbusiness"\n'))).toBeNull();
    expect(e2eTargetProblem({}, envFile('DATABASE_URL=postgres://u:p@127.0.0.1:55432/e2e\n'))).toBeNull();
  });

  it('allows a local backend you started yourself', () => {
    expect(e2eTargetProblem({ E2E_BACKEND_URL: 'http://localhost:3041', E2E_SKIP_BACKEND: 'true' })).toBeNull();
  });

  it('refuses when no DATABASE_URL can be found', () => {
    expect(e2eTargetProblem({}, path.join(dir, 'missing.env'))).toMatch(/No DATABASE_URL/);
  });
});
