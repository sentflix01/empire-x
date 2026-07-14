import { vi } from 'vitest';

/**
 * Manual mock for @/api/client
 * Usage in tests: vi.mock('@/api/client')
 * Then override per-test: (client.get as ReturnType<typeof vi.fn>).mockResolvedValue(...)
 */
const client = {
  get: vi.fn().mockResolvedValue({ data: [] }),
  post: vi.fn().mockResolvedValue({ data: {} }),
  put: vi.fn().mockResolvedValue({ data: {} }),
  patch: vi.fn().mockResolvedValue({ data: {} }),
  delete: vi.fn().mockResolvedValue({ data: {} }),
};

export function storeToken(_token: string) {}
export function clearToken() {}

export default client;
