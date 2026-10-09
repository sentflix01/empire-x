import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({
    version: '1',
    name: 'Nodbusiness API',
    description: 'Backend API for the Nodbusiness global superapp.',
    base_url: '/api',
    docs_url: 'https://docs.nodbusiness.app',
    endpoints: {
      auth:         '/api/auth',
      profiles:     '/api/profiles',
      posts:        '/api/posts',
      products:     '/api/products',
      orders:       '/api/orders',
      messages:     '/api/messages',
      notifications:'/api/notifications',
      businesses:   '/api/businesses',
      showrooms:    '/api/showrooms',
      wallet:       '/api/wallet',
      search:       '/api/search',
      trending:     '/api/trending',
      health:       '/health',
    },
  });
});

module.exports = router;
