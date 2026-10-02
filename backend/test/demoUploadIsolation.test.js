const path = require('path');
const uploadMiddleware = require('../middleware/upload');

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
      .toBe(path.join(path.resolve('uploads'), 'demo', demoSessionId));
  });

  test('rejects unsafe session identifiers before building storage paths', () => {
    expect(() => uploadMiddleware.createStorageKey('x.png', '../real', 'asset-1'))
      .toThrow(/Invalid demo session ID/i);
  });
});
