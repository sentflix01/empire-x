'use strict';

/**
 * Unit tests for backend/services/ssrfValidator.js
 *
 * Validates: Requirements 2.1, 2.2, 2.5
 * Design refs: Testing Strategy → Unit Tests (ssrfValidator.test.js)
 */

// ---------------------------------------------------------------------------
// Mock dns.promises before requiring the module under test
// ---------------------------------------------------------------------------

jest.mock('dns', () => {
  const actual = jest.requireActual('dns');
  return {
    ...actual,
    promises: {
      lookup: jest.fn(),
    },
  };
});

const dns = require('dns');
const { isBlockedIp, validateUrl } = require('../services/ssrfValidator');

// Convenience: resolve to a single public address
function mockDnsResolve(address, family = 4) {
  dns.promises.lookup.mockResolvedValue([{ address, family }]);
}

// Convenience: reject DNS resolution
function mockDnsReject(message = 'ENOTFOUND') {
  dns.promises.lookup.mockRejectedValue(new Error(message));
}

afterEach(() => {
  jest.clearAllMocks();
});

// ===========================================================================
// isBlockedIp — RFC-1918 private ranges
// ===========================================================================

describe('isBlockedIp — RFC-1918 10.0.0.0/8', () => {
  test.each([
    '10.0.0.0',       // network address
    '10.0.0.1',       // first host
    '10.255.255.255', // last address
    '10.128.64.32',   // middle
  ])('blocks %s', (ip) => {
    expect(isBlockedIp(ip)).toBe(true);
  });

  test.each([
    '9.255.255.255',  // just before range
    '11.0.0.0',       // just after range
  ])('does NOT block %s (public)', (ip) => {
    expect(isBlockedIp(ip)).toBe(false);
  });
});

describe('isBlockedIp — RFC-1918 172.16.0.0/12', () => {
  test.each([
    '172.16.0.0',    // first address
    '172.16.0.1',
    '172.31.255.255',// last address
    '172.24.0.1',    // middle
  ])('blocks %s', (ip) => {
    expect(isBlockedIp(ip)).toBe(true);
  });

  test.each([
    '172.15.255.255', // just before range
    '172.32.0.0',     // just after range
  ])('does NOT block %s (public)', (ip) => {
    expect(isBlockedIp(ip)).toBe(false);
  });
});

describe('isBlockedIp — RFC-1918 192.168.0.0/16', () => {
  test.each([
    '192.168.0.0',
    '192.168.0.1',
    '192.168.255.255',
    '192.168.100.100',
  ])('blocks %s', (ip) => {
    expect(isBlockedIp(ip)).toBe(true);
  });

  test.each([
    '192.167.255.255', // just before range
    '192.169.0.0',     // just after range
  ])('does NOT block %s (public)', (ip) => {
    expect(isBlockedIp(ip)).toBe(false);
  });
});

// ===========================================================================
// isBlockedIp — Loopback 127.0.0.0/8
// ===========================================================================

describe('isBlockedIp — loopback 127.0.0.0/8', () => {
  test.each([
    '127.0.0.0',
    '127.0.0.1',       // classic loopback
    '127.255.255.255',
    '127.1.2.3',
  ])('blocks %s', (ip) => {
    expect(isBlockedIp(ip)).toBe(true);
  });

  test('does NOT block 128.0.0.0 (just after loopback range)', () => {
    expect(isBlockedIp('128.0.0.0')).toBe(false);
  });
});

// ===========================================================================
// isBlockedIp — Link-local 169.254.0.0/16
// ===========================================================================

describe('isBlockedIp — link-local 169.254.0.0/16', () => {
  test.each([
    '169.254.0.0',
    '169.254.0.1',
    '169.254.255.255',
    '169.254.169.254', // AWS metadata endpoint
  ])('blocks %s', (ip) => {
    expect(isBlockedIp(ip)).toBe(true);
  });

  test.each([
    '169.253.255.255', // just before range
    '169.255.0.0',     // just after range
  ])('does NOT block %s (public)', (ip) => {
    expect(isBlockedIp(ip)).toBe(false);
  });
});

// ===========================================================================
// isBlockedIp — IPv6 loopback
// ===========================================================================

describe('isBlockedIp — IPv6 loopback', () => {
  test('blocks ::1', () => {
    expect(isBlockedIp('::1')).toBe(true);
  });

  test('blocks full-form IPv6 loopback', () => {
    expect(isBlockedIp('0:0:0:0:0:0:0:1')).toBe(true);
  });

  test('blocks IPv4-mapped IPv6 loopback ::ffff:127.0.0.1', () => {
    expect(isBlockedIp('::ffff:127.0.0.1')).toBe(true);
  });

  test('blocks IPv4-mapped IPv6 private range ::ffff:10.0.0.1', () => {
    expect(isBlockedIp('::ffff:10.0.0.1')).toBe(true);
  });

  test('does NOT block public IPv6 address', () => {
    expect(isBlockedIp('2001:db8::1')).toBe(false);
  });
});

// ===========================================================================
// isBlockedIp — "localhost" hostname alias
// ===========================================================================

describe('isBlockedIp — localhost string', () => {
  test('blocks "localhost"', () => {
    expect(isBlockedIp('localhost')).toBe(true);
  });

  test('blocks "LOCALHOST" (case-insensitive)', () => {
    expect(isBlockedIp('LOCALHOST')).toBe(true);
  });
});

// ===========================================================================
// isBlockedIp — public / routable addresses (should NOT be blocked)
// ===========================================================================

describe('isBlockedIp — public IP addresses are not blocked', () => {
  test.each([
    '1.1.1.1',         // Cloudflare DNS
    '8.8.8.8',         // Google DNS
    '104.16.0.0',      // Cloudflare CDN range
    '52.0.0.0',        // AWS public range
    '172.32.0.0',      // just outside 172.16/12
    '191.255.255.255', // just before 192.168/16
    '193.0.0.0',       // just after 192.168/16
  ])('does NOT block %s', (ip) => {
    expect(isBlockedIp(ip)).toBe(false);
  });
});

// ===========================================================================
// isBlockedIp — edge / invalid inputs
// ===========================================================================

describe('isBlockedIp — invalid inputs', () => {
  test('treats non-string as blocked', () => {
    expect(isBlockedIp(null)).toBe(true);
    expect(isBlockedIp(undefined)).toBe(true);
    expect(isBlockedIp(127)).toBe(true);
  });
});

// ===========================================================================
// validateUrl — scheme validation
// ===========================================================================

describe('validateUrl — scheme enforcement', () => {
  test('rejects http:// URL', async () => {
    const result = await validateUrl('http://example.com/api');
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('rejects ftp:// URL', async () => {
    const result = await validateUrl('ftp://files.example.com/data');
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('rejects data: URL', async () => {
    const result = await validateUrl('data:text/html,<h1>hi</h1>');
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('rejects javascript: URL', async () => {
    const result = await validateUrl('javascript:alert(1)');
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('rejects malformed / non-URL string', async () => {
    const result = await validateUrl('not-a-url');
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('rejects empty string', async () => {
    const result = await validateUrl('');
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('https:// with public IP resolves successfully', async () => {
    mockDnsResolve('93.184.216.34'); // example.com
    const result = await validateUrl('https://example.com/api/data');
    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

// ===========================================================================
// validateUrl — SSRF: direct IP literals in the URL (no DNS needed)
// ===========================================================================

describe('validateUrl — SSRF via IP literal in URL', () => {
  test('blocks https://127.0.0.1/', async () => {
    const result = await validateUrl('https://127.0.0.1/');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/blocked/i);
  });

  test('blocks https://10.0.0.1/', async () => {
    const result = await validateUrl('https://10.0.0.1/');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/blocked/i);
  });

  test('blocks https://192.168.1.1/', async () => {
    const result = await validateUrl('https://192.168.1.1/');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/blocked/i);
  });

  test('blocks https://172.20.0.1/', async () => {
    const result = await validateUrl('https://172.20.0.1/');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/blocked/i);
  });

  test('blocks https://169.254.169.254/ (AWS metadata)', async () => {
    const result = await validateUrl('https://169.254.169.254/latest/meta-data/');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/blocked/i);
  });

  test('blocks https://[::1]/ (IPv6 loopback literal)', async () => {
    // When DNS is mocked, we need to simulate what real DNS returns for ::1.
    // The hostname parsed from https://[::1]/ is "[::1]" (with brackets), which
    // net.isIPv6 doesn't recognise, so it falls through to DNS lookup.
    // Mock it to return the ::1 address so isBlockedIp catches it.
    dns.promises.lookup.mockResolvedValue([{ address: '::1', family: 6 }]);
    const result = await validateUrl('https://[::1]/');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/blocked/i);
  });
});

// ===========================================================================
// validateUrl — SSRF: DNS resolution mock
// ===========================================================================

describe('validateUrl — SSRF via DNS resolution', () => {
  test('blocks when hostname resolves to 127.0.0.1 (loopback)', async () => {
    mockDnsResolve('127.0.0.1');
    const result = await validateUrl('https://totally-legit.example.com/api');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/blocked/i);
  });

  test('blocks when hostname resolves to 10.x.x.x (RFC-1918)', async () => {
    mockDnsResolve('10.0.0.5');
    const result = await validateUrl('https://internal-service.example.com/data');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/blocked/i);
  });

  test('blocks when hostname resolves to 192.168.x.x (RFC-1918)', async () => {
    mockDnsResolve('192.168.100.200');
    const result = await validateUrl('https://company-api.example.com/v1');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/blocked/i);
  });

  test('blocks when hostname resolves to 172.16-31.x.x (RFC-1918)', async () => {
    mockDnsResolve('172.16.0.1');
    const result = await validateUrl('https://subnet-host.example.com/');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/blocked/i);
  });

  test('blocks when hostname resolves to link-local 169.254.x.x', async () => {
    mockDnsResolve('169.254.0.1');
    const result = await validateUrl('https://link-local.example.com/');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/blocked/i);
  });

  test('blocks if ANY resolved address is private (multi-record response)', async () => {
    dns.promises.lookup.mockResolvedValue([
      { address: '93.184.216.34', family: 4 },  // public — ok
      { address: '10.0.0.1', family: 4 },       // private — must trigger block
    ]);
    const result = await validateUrl('https://mixed-response.example.com/');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/blocked/i);
  });

  test('accepts when hostname resolves to a public IP', async () => {
    mockDnsResolve('93.184.216.34'); // example.com public
    const result = await validateUrl('https://api.example.com/v2/data');
    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('returns ok: false when DNS resolution fails (ENOTFOUND)', async () => {
    mockDnsReject('ENOTFOUND no-such-domain.example');
    const result = await validateUrl('https://no-such-domain.example/api');
    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ===========================================================================
// validateUrl — localhost hostname
// ===========================================================================

describe('validateUrl — localhost hostname', () => {
  test('blocks https://localhost/', async () => {
    const result = await validateUrl('https://localhost/');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/blocked/i);
  });

  test('blocks https://localhost:8080/api', async () => {
    const result = await validateUrl('https://localhost:8080/api');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/blocked/i);
  });
});

// ===========================================================================
// validateUrl — never throws
// ===========================================================================

describe('validateUrl — never throws', () => {
  const weirdInputs = [
    null,
    undefined,
    123,
    {},
    '',
    'http://',
    '//missing-scheme.com',
    'https://:8080/',
  ];

  test.each(weirdInputs)('does not throw for input: %p', async (input) => {
    await expect(validateUrl(input)).resolves.toEqual(
      expect.objectContaining({ ok: false })
    );
  });
});
