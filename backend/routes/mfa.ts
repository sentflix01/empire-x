/**
 * routes/mfa.ts — managing two-factor sign-in (audit F-017). Mounted at
 * /api/auth/mfa; the sign-in step itself (POST /verify) lives in routes/auth.ts.
 *
 *   GET  /status          whether it is on, recovery codes left, whether a password exists
 *   POST /setup           { password? } → { secret, otpauth_url } (not yet on)
 *   POST /enable          { code } → { recovery_codes } shown once
 *   POST /disable         { code, password? }
 *   POST /recovery-codes  { code } → { recovery_codes } (replaces the old ones)
 *
 * People with a password confirm it for setup and disable. Admins cannot turn
 * it off while it is required for admins (ADMIN_MFA_REQUIRED).
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db/pool';
import { getCurrentDatabaseEnvironment } from '../db/pool';
import { requireAuth, invalidateUserCache } from '../middleware/auth';
import { isEnabled } from '../lib/featureFlags';
import { checkSecondFactor, disable, enable, getMfa, replaceRecoveryCodes, startSetup, unusedRecoveryCodes } from '../lib/mfa';
import { adminMfaRequired } from '../lib/adminMfa';
import { otpauthUri } from '../lib/totp';
import * as apiError from '../lib/apiError';
import logger from '../lib/logger';

const router = Router();

async function passwordHash(userId: string): Promise<string | null> {
  const { rows } = await pool.query<{ password_hash: string | null }>('SELECT password_hash FROM users WHERE id = $1', [userId]);
  return rows[0]?.password_hash ?? null;
}

/** People with a password must confirm it; Google-only accounts have none. */
async function passwordConfirmed(userId: string, password: unknown): Promise<boolean> {
  const hash = await passwordHash(userId);
  if (!hash) return true;
  return typeof password === 'string' && password.length <= 128 && bcrypt.compare(password, hash);
}

function realOnly(req: Request, res: Response): boolean {
  if (getCurrentDatabaseEnvironment() === 'real' && !req.user?.is_demo) return true;
  res.status(403).json({ error: 'Two-factor sign-in is not available in Demo.', code: 'MFA_NOT_IN_DEMO' });
  return false;
}

router.get('/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const row = await getMfa(req.user!.id);
    res.json({
      enabled: Boolean(row?.enabled_at),
      pending: Boolean(row && !row.enabled_at),
      recovery_codes_left: row?.enabled_at ? unusedRecoveryCodes(row) : 0,
      setup_allowed: await isEnabled('two_factor_auth', req.user!.id),
      required: req.user!.role === 'admin' && adminMfaRequired(),
      // Setup and turning off ask for the password only when there is one.
      has_password: Boolean(await passwordHash(req.user!.id)),
    });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'MFA status error');
    apiError.serverError(res, 'Could not load two-factor settings');
  }
});

router.post('/setup', requireAuth, async (req: Request, res: Response) => {
  if (!realOnly(req, res)) return;
  try {
    if (!(await isEnabled('two_factor_auth', req.user!.id))) {
      res.status(403).json({ error: 'Two-factor sign-in is not available yet.', code: 'MFA_NOT_AVAILABLE' });
      return;
    }
    const existing = await getMfa(req.user!.id);
    if (existing?.enabled_at) { res.status(409).json({ error: 'Two-factor sign-in is already on.', code: 'MFA_ALREADY_ON' }); return; }
    if (!(await passwordConfirmed(req.user!.id, (req.body as { password?: unknown }).password))) {
      res.status(401).json({ error: 'Password is not correct.', code: 'PASSWORD_INVALID' });
      return;
    }
    const secret = await startSetup(req.user!.id);
    res.json({ secret, otpauth_url: otpauthUri(secret, req.user!.email ?? req.user!.id) });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'MFA setup error');
    apiError.serverError(res, 'Could not start two-factor setup');
  }
});

router.post('/enable', requireAuth, async (req: Request, res: Response) => {
  if (!realOnly(req, res)) return;
  const code = (req.body as { code?: unknown }).code;
  if (typeof code !== 'string' || !code.trim()) { apiError.validationError(res, 'Enter the 6-digit code from your app'); return; }
  try {
    const row = await getMfa(req.user!.id);
    if (!row) { res.status(409).json({ error: 'Start setup first.', code: 'MFA_NOT_STARTED' }); return; }
    if (row.enabled_at) { res.status(409).json({ error: 'Two-factor sign-in is already on.', code: 'MFA_ALREADY_ON' }); return; }
    const matched = await checkSecondFactor(req.user!.id, code, { allowRecovery: false, requireEnabled: false });
    if (!matched) { res.status(400).json({ error: 'That code is not correct. Check the time on your phone and try again.', code: 'MFA_CODE_INVALID' }); return; }
    const recoveryCodes = await enable(req.user!.id);
    await invalidateUserCache(req.user!.id);
    logger.info({ userId: req.user!.id }, 'Two-factor sign-in turned on');
    res.json({ enabled: true, recovery_codes: recoveryCodes });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'MFA enable error');
    apiError.serverError(res, 'Could not turn on two-factor sign-in');
  }
});

router.post('/disable', requireAuth, async (req: Request, res: Response) => {
  if (!realOnly(req, res)) return;
  const { code, password } = req.body as { code?: unknown; password?: unknown };
  if (typeof code !== 'string' || !code.trim()) { apiError.validationError(res, 'Enter a code from your app or a recovery code'); return; }
  try {
    if (req.user!.role === 'admin' && adminMfaRequired()) {
      res.status(403).json({ error: 'Admins must keep two-factor sign-in on.', code: 'MFA_REQUIRED_FOR_ADMINS' });
      return;
    }
    const row = await getMfa(req.user!.id);
    if (!row?.enabled_at) { res.status(409).json({ error: 'Two-factor sign-in is not on.', code: 'MFA_NOT_ON' }); return; }
    if (!(await passwordConfirmed(req.user!.id, password))) { res.status(401).json({ error: 'Password is not correct.', code: 'PASSWORD_INVALID' }); return; }
    if (!(await checkSecondFactor(req.user!.id, code, { allowRecovery: true, requireEnabled: true }))) {
      res.status(400).json({ error: 'That code is not correct.', code: 'MFA_CODE_INVALID' });
      return;
    }
    await disable(req.user!.id);
    await invalidateUserCache(req.user!.id);
    logger.info({ userId: req.user!.id }, 'Two-factor sign-in turned off');
    res.json({ enabled: false });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'MFA disable error');
    apiError.serverError(res, 'Could not turn off two-factor sign-in');
  }
});

router.post('/recovery-codes', requireAuth, async (req: Request, res: Response) => {
  if (!realOnly(req, res)) return;
  const code = (req.body as { code?: unknown }).code;
  if (typeof code !== 'string' || !code.trim()) { apiError.validationError(res, 'Enter the 6-digit code from your app'); return; }
  try {
    if (!(await checkSecondFactor(req.user!.id, code, { allowRecovery: false, requireEnabled: true }))) {
      res.status(400).json({ error: 'That code is not correct.', code: 'MFA_CODE_INVALID' });
      return;
    }
    res.json({ recovery_codes: await replaceRecoveryCodes(req.user!.id) });
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'MFA recovery codes error');
    apiError.serverError(res, 'Could not create new recovery codes');
  }
});

module.exports = router;
