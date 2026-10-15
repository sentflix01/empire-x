import { isPublicDemoReadPath } from '../middleware/publicDemoBrowse';
import { publicDemoBrowseMiddleware } from '../middleware/publicDemoBrowse';
import type { Request, Response } from 'express';
import pool from '../db/pool';

describe('public Demo discovery boundary', () => {
  it.each([
    '/api/posts', '/api/posts/7a4ed4f6-8916-4a94-8623-a642909b8f29',
    '/api/businesses', '/api/businesses/8c3942f6-5f5d-48e1-9556-b9e88aaf0ed4',
    '/api/products', '/api/products/b6fe9a9e-b0ed-47d3-94de-f52d7c67a5dd',
    '/api/profiles', '/api/profiles/826ce37c-a232-4c8d-9a64-4bc2263462d2',
    '/api/showrooms', '/api/showrooms/21a7e849-14a9-40bf-886b-c72cf2cf9dd7',
    '/api/stories', '/api/stories/user/8b548b4a-e2bc-4c97-b813-d6e76bfac57a',
    '/api/posts/7a4ed4f6-8916-4a94-8623-a642909b8f29/comments',
  ])('allows public discovery read path %s', path => {
    expect(isPublicDemoReadPath(path)).toBe(true);
  });

  it.each([
    '/api/auth/me', '/api/orders', '/api/wallet', '/api/posts/42/like',
    '/api/posts/42/comments', '/api/products/mine', '/api/profiles/follows',
    '/api/showrooms/slug/real-business', '/api/showrooms/sitemap-data',
  ])('does not select Demo for private, mutating, or special path %s', path => {
    expect(isPublicDemoReadPath(path)).toBe(false);
  });

  it('runs anonymous allowlisted reads in Demo context without creating a user session', () => {
    const previous = {
      enabled: process.env.DEMO_ENABLED,
      demoUrl: process.env.DEMO_DATABASE_URL,
    };
    process.env.DEMO_ENABLED = 'true';
    process.env.DEMO_DATABASE_URL = 'postgres://demo.invalid/test';
    const req = {
      path: '/api/posts', method: 'GET', cookies: {},
      get: (name: string) => name.toLowerCase() === 'x-public-demo-read' ? '1' : undefined,
    } as unknown as Request;
    const res = {
      vary: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(),
    } as unknown as Response;
    const next = jest.fn(() => {
      expect(pool.getCurrentDatabaseEnvironment()).toBe('demo');
      expect(req.publicDemoRead).toBe(true);
      expect(req.demoSession).toBeUndefined();
      expect(req.user).toBeUndefined();
    });

    try {
      publicDemoBrowseMiddleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    } finally {
      if (previous.enabled === undefined) delete process.env.DEMO_ENABLED;
      else process.env.DEMO_ENABLED = previous.enabled;
      if (previous.demoUrl === undefined) delete process.env.DEMO_DATABASE_URL;
      else process.env.DEMO_DATABASE_URL = previous.demoUrl;
    }
  });

  it('rejects write requests that try to select Demo through the public header', () => {
    const req = {
      path: '/api/posts', method: 'POST', cookies: {},
      get: (name: string) => name.toLowerCase() === 'x-public-demo-read' ? '1' : undefined,
    } as unknown as Request;
    const res = {
      vary: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(),
    } as unknown as Response;
    const next = jest.fn();

    publicDemoBrowseMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'PUBLIC_DEMO_READ_ONLY' }));
    expect(next).not.toHaveBeenCalled();
  });
});
