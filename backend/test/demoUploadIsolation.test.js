const path = require('path');
const uploadMiddleware = require('../middleware/upload');
const demoEnvironment = require('../middleware/demoEnvironment');

const demoSessionId = 'b77f1c5a-a0b0-4b61-9cb9-0fd2abe7d1a1';

describe('demo upload isolation', () => {
  test('places cloud objects inside the session prefix cleaned by cleanup-demo', () => {
    expect(uploadMiddleware.createStorageKey('logo.PNG', demoSessionId, 'asset-1'))
      .toBe(`demo/${demoSessionId}/uploads/asset-1.png`);
  });

  test('keeps real-account uploads in the ordinary uploads prefix', () => {
    expect(uploadMiddleware.createStorageKey('logo.PNG', undefined, 'asset-1'))
      .toBe('uploads/asset-1.png');
  });

  test('routes local demo uploads to a session-owned folder', () => {
    expect(uploadMiddleware.getUploadDirectory(path.resolve('uploads'), demoSessionId))
      .toBe(path.join(path.resolve('uploads'), 'demo', demoSessionId, 'uploads'));
  });

  test('rejects unsafe session identifiers before building storage paths', () => {
    expect(() => uploadMiddleware.createStorageKey('x.png', '../real', 'asset-1'))
      .toThrow(/Invalid demo session ID/i);
  });

  test('signs local asset tokens for only the exact Demo session asset', () => {
    const oldSecret = process.env.DEMO_SESSION_SECRET;
    const oldJwtSecret = process.env.JWT_SECRET;
    process.env.DEMO_SESSION_SECRET = 'demo-assets-test-secret-with-more-than-32-bytes';
    process.env.JWT_SECRET = 'different-real-jwt-test-secret';
    try {
      const key = `demo/${demoSessionId}/uploads/image.png`;
      const token = demoEnvironment.signDemoAssetToken(demoSessionId, key);
      expect(demoEnvironment.verifyDemoAssetToken(token, demoSessionId, key)).toBe(true);
      expect(demoEnvironment.verifyDemoAssetToken(token, demoSessionId, `${key}.other`)).toBe(false);
      expect(demoEnvironment.verifyDemoAssetToken(token, 'dcbef03f-a568-4a07-9b54-cb93b07e0f77', key)).toBe(false);
    } finally {
      if (oldSecret === undefined) delete process.env.DEMO_SESSION_SECRET;
      else process.env.DEMO_SESSION_SECRET = oldSecret;
      if (oldJwtSecret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = oldJwtSecret;
    }
  });

  test('uses the new Supabase secret key as an API key, not as a Bearer JWT', () => {
    const headers = uploadMiddleware.getSupabaseStorageAuthHeaders('sb_secret_demo-test');
    expect(headers).toEqual({ apikey: 'sb_secret_demo-test' });
    expect(uploadMiddleware.getSupabaseStorageAuthHeaders('legacy-service-role-jwt')).toEqual({
      Authorization: 'Bearer legacy-service-role-jwt',
      apikey: 'legacy-service-role-jwt',
    });
  });

  test('uploads Demo files to the distinct private bucket and returns a signed URL', async () => {
    const keys = ['SUPABASE_API_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL', 'SUPABASE_STORAGE_KEY', 'SUPABASE_BUCKET', 'DEMO_SUPABASE_BUCKET'];
    const oldValues = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
    for (const key of keys) delete process.env[key];
    process.env.SUPABASE_API_URL = 'https://exampleproject.supabase.co';
    process.env.SUPABASE_STORAGE_KEY = 'sb_secret_demo-test';
    process.env.SUPABASE_BUCKET = 'real-public-uploads';
    process.env.DEMO_SUPABASE_BUCKET = 'demo-private-uploads';
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({ ok: true, status: 200, text: async () => '' })
      .mockImplementationOnce(async (input) => {
        const uploadPath = new URL(input).pathname;
        const key = uploadPath.split('/object/sign/demo-private-uploads/')[1];
        return { ok: true, status: 200, json: async () => ({ signedURL: `/object/sign/demo-private-uploads/${key}?token=temporary` }) };
      });
    try {
      const url = await uploadMiddleware.uploadToSupabase(Buffer.from('image'), 'image.png', 'image/png', demoSessionId);
      expect(fetchMock.mock.calls[0][0]).toContain('/object/demo-private-uploads/demo/');
      expect(fetchMock.mock.calls[0][0]).not.toContain('/object/public/');
      expect(fetchMock.mock.calls[1][0]).toContain('/object/sign/demo-private-uploads/demo/');
      for (const [, options] of fetchMock.mock.calls) {
        expect(options.headers.apikey).toBe('sb_secret_demo-test');
        expect(options.headers.Authorization).toBeUndefined();
      }
      expect(url).toMatch(/^https:\/\/exampleproject\.supabase\.co\/storage\/v1\/object\/sign\/demo-private-uploads\/demo\/b77f1c5a-a0b0-4b61-9cb9-0fd2abe7d1a1\/uploads\/\d+-\d+\.png\?token=temporary$/);
    } finally {
      fetchMock.mockRestore();
      for (const key of keys) {
        if (oldValues[key] === undefined) delete process.env[key];
        else process.env[key] = oldValues[key];
      }
    }
  });

  test('refuses Demo storage buckets that are public or reused from Real', async () => {
    const keys = ['DEMO_ENABLED', 'SUPABASE_API_URL', 'SUPABASE_STORAGE_KEY', 'SUPABASE_BUCKET', 'DEMO_SUPABASE_BUCKET'];
    const oldValues = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
    process.env.DEMO_ENABLED = 'true';
    process.env.SUPABASE_API_URL = 'https://exampleproject.supabase.co';
    process.env.SUPABASE_STORAGE_KEY = 'service-role-test-key';
    process.env.SUPABASE_BUCKET = 'real-public-uploads';
    process.env.DEMO_SUPABASE_BUCKET = 'demo-private-uploads';
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true, status: 200, json: async () => ({ id: 'demo-private-uploads', public: true }),
    });
    try {
      await expect(uploadMiddleware.verifyDemoStorageIsolation()).rejects.toThrow(/public=false/);
      process.env.DEMO_SUPABASE_BUCKET = 'real-public-uploads';
      await expect(uploadMiddleware.verifyDemoStorageIsolation()).rejects.toThrow(/different from the public Real bucket/);
    } finally {
      fetchMock.mockRestore();
      for (const key of keys) {
        if (oldValues[key] === undefined) delete process.env[key];
        else process.env[key] = oldValues[key];
      }
    }
  });
});
