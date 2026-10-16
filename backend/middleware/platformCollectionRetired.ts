/**
 * middleware/platformCollectionRetired.ts
 *
 * NodBusiness never holds customer funds (owner decision 2026-10-16,
 * docs/decisions/platform-model-decisions.md §1). Routes that would move money
 * into a NodBusiness-owned account or wallet now answer 410 Gone. Callbacks and
 * webhooks for payments already in progress keep working so they can finish,
 * and wallet withdrawal stays open so existing balances can be paid out.
 */
import type { Request, Response, NextFunction } from 'express';

export function platformCollectionRetired(message: string) {
  return (_req: Request, res: Response, _next: NextFunction): void => {
    res.status(410).json({ error: message, code: 'PLATFORM_COLLECTION_RETIRED' });
  };
}

module.exports = { platformCollectionRetired };
