/**
 * middleware/textLimits.ts — rejects JSON bodies with text longer than its
 * limit (lib/textLimits.ts), before any route runs (audit F-058). One member
 * could otherwise save megabyte-long titles that every visitor then downloads.
 * Mount after the body parsers. Multipart routes cap their own text fields.
 */
import type { NextFunction, Request, Response } from 'express';
import { fieldLabel, findTextLimitViolation } from '../lib/textLimits';

export default function textLimits(req: Request, res: Response, next: NextFunction): void {
  const hit = findTextLimitViolation(req.body);
  if (!hit) { next(); return; }
  res.status(422).json({
    error: `${fieldLabel(hit.field)} is too long: ${hit.length.toLocaleString('en-US')} characters (maximum ${hit.max.toLocaleString('en-US')}).`,
    code: 'TEXT_TOO_LONG',
    field: hit.field,
    max: hit.max,
  });
}

module.exports = textLimits;
