/**
 * Vercel turns every file in a project-root `api/` folder into a serverless
 * function. The frontend's API client used to live there, so each client
 * module was deployed as a pointless function, and #207 went over the Hobby
 * plan's 12-function limit ("Deploying outputs" failed). The client lives in
 * lib/api/ now; this keeps a root api/ folder from coming back.
 */
import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';

describe('frontend-next layout', () => {
  it('has no root api/ folder (Vercel would deploy each file as a function)', () => {
    expect(existsSync(join(__dirname, '..', 'api'))).toBe(false);
    expect(existsSync(join(__dirname, '..', 'lib', 'api', 'client.ts'))).toBe(true);
  });
});
