/**
 * Safety guard for the E2E suite (audit DATA-03). playwright.config.ts calls
 * e2eTargetProblem() when it loads, before any web server starts.
 *
 * The specs create products, orders, conversations and accounts. A run against
 * the hosted database left 17 "E2E Test Product" listings on the live
 * marketplace in October 2026. So before any test starts:
 *   - the backend the tests call must be on this machine, and
 *   - when Playwright starts the backend itself, its DATABASE_URL must point at
 *     a database on this machine (or the docker-compose "postgres" service).
 * There is no override: point the suite at a local stack instead.
 */
import fs from 'node:fs';
import path from 'node:path';

type Env = Record<string, string | undefined>;

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
// docker-compose.yml names its database service "postgres".
const LOCAL_DB_HOSTS = new Set([...LOCAL_HOSTS, 'postgres']);

function hostOf(url: string): string | null {
  try { return new URL(url).hostname.toLowerCase(); } catch { return null; }
}

/** DATABASE_URL as the backend's `npm run dev` will see it: the environment wins over backend/.env. */
export function backendDatabaseUrl(env: Env = process.env, envFile = path.resolve(__dirname, '../../backend/.env')): string | null {
  if (env.DATABASE_URL) return env.DATABASE_URL;
  let text: string;
  try { text = fs.readFileSync(envFile, 'utf8'); } catch { return null; }
  const line = text.split(/\r?\n/).find((l) => /^\s*DATABASE_URL\s*=/.test(l));
  if (!line) return null;
  return line.replace(/^\s*DATABASE_URL\s*=\s*/, '').trim().replace(/^(['"])(.*)\1$/, '$2');
}

/** Returns why the run must not start, or null when it is safe. */
export function e2eTargetProblem(env: Env = process.env, envFile?: string): string | null {
  const backendUrl = env.E2E_BACKEND_URL ?? 'http://localhost:3001';
  const apiHost = hostOf(backendUrl);
  if (!apiHost || !LOCAL_HOSTS.has(apiHost)) {
    return `E2E_BACKEND_URL points at "${apiHost ?? backendUrl}". The suite writes data, so it only runs against a backend on this machine.`;
  }
  if (env.E2E_SKIP_BACKEND === 'true') return null; // a backend you started yourself; its URL is local
  const dbUrl = backendDatabaseUrl(env, envFile);
  if (!dbUrl) return 'No DATABASE_URL found for the backend (environment or backend/.env). Point it at a local Postgres.';
  const dbHost = hostOf(dbUrl);
  if (!dbHost || !LOCAL_DB_HOSTS.has(dbHost)) {
    return `The backend's DATABASE_URL points at "${dbHost ?? 'an unreadable host'}". The suite writes data, so it only runs against a local database.`;
  }
  return null;
}

