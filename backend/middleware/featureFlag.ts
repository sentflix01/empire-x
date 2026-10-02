import type { Request, Response, NextFunction } from 'express';
import { isEnabled } from '../lib/featureFlags';
import logger from '../lib/logger';

/** Fail closed when an enabled feature is unavailable or cannot be resolved. */
export function requireFeatureFlag(flagName: string, unavailableMessage: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!(await isEnabled(flagName, req.user?.id ?? null))) {
        res.status(503).json({ error: unavailableMessage, code: 'FEATURE_DISABLED' });
        return;
      }
      next();
    } catch (err) {
      logger.error({ err: (err as Error).message, flagName }, 'Feature flag check failed');
      res.status(503).json({ error: unavailableMessage, code: 'FEATURE_FLAG_UNAVAILABLE' });
    }
  };
}
