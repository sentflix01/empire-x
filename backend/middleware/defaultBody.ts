/**
 * middleware/defaultBody.ts — Express 5 leaves req.body undefined when no
 * body parser matched (for example a text/plain request). Routes destructure
 * req.body, which then threw and answered 500 (audit F-034). Mount after the
 * body parsers; later route-level parsers and multer still replace it.
 */
import type { NextFunction, Request, Response } from 'express';

export default function defaultBody(req: Request, _res: Response, next: NextFunction): void {
  if (req.body === undefined) req.body = {};
  next();
}

module.exports = defaultBody;
