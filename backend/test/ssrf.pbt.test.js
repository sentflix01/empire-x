'use strict';

/**
 * ssrf.pbt.test.js — Property-based tests for SSRF validation
 *
 * Feature: showroom-external-api
 *
 * Covers:
 *   Property 1: HTTPS-only URL acceptance
 *   Property 2: SSRF blocked IP ranges
 *
 * Requirements: 1.3, 1.4, 2.1, 2.2
 */

const fc = require('fast-check');
const { isBlockedIp, validateUrl } = require('../services/ssrfValidator');
const dns = require('dns');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns true when an IPv4 address string belongs to a private / blocked range:
 *   10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.0.0/16
 */
function isPrivateIpv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p))) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

/**
 * Returns true when an IPv4 address is definitely public (not private/loopback/link-local).
 * Excludes 0.x.x.x and 255.x.x.x to stay within sane public-IP space.
 */
function isPublicIpv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p))) return false;
  const [a] = parts;
  if (a === 0 || a === 255) return false; // reserved/broadcast
  return !isPrivateIpv4(ip);
}

// ─── Property 1: HTTPS-only URL Acceptance ───────────────────────────────────
// Feature: showroom-external-api, Property 1: HTTPS-only URL acceptance

describe('Property 1 — HTTPS-only URL acceptance', () => {
  /**
   * For any URL whose scheme is not "https", validateUrl MUST return
   * { ok: false, error: 'non_https_scheme' } without performing DNS resolution.
   *
   * Validates: Requirements 1.3, 1.4
   */
  test('non-HTTPS URLs are always rejected (ok: false)', async () => {
    // Build non-HTTPS scheme URLs using concrete non-HTTPS schemes
    const nonHttpsSchemeArb = fc.oneof(
      fc.constant('http'),
      fc.constant('ftp'),
      fc.constant('data'),
      fc.constant('file'),
      fc.constant('ws'),
      fc.constant('wss'),
    );

    // Pair scheme with a valid-looking host to form a well-formed non-HTTPS URL
    const nonHttpsUrlArb = fc.tuple(
      nonHttpsSchemeArb,
      fc.domain(),
    ).map(([scheme, host]) => `${scheme}://${host}/path`);

    await fc.assert(
      fc.asyncProperty(nonHttpsUrlArb, async (url) => {
        const result = await validateUrl(url);
        expect(result.ok).toBe(false);
        expect(result.error).toBe('non_https_scheme');
      }),
      { numRuns: 100 },
    );
  });

  /**
   * For HTTPS URLs pointing to a hostname that resolves to a public IP,
   * validateUrl MUST return { ok: true }.
   *
   * We mock dns.promises.lookup to return a known public IP so the test
   * never makes real network calls and is fully deterministic.
   *
   * Validates: Requirements 1.3, 1.4
   */
  test('HTTPS URLs with public-IP hostnames are accepted (ok: true)', async () => {
    const domainArb = fc.domain();

    // Mock dns.promises.lookup once before each run to return a known public IP
    const originalLookup = dns.promises.lookup;

    try {
      await fc.assert(
        fc.asyncProperty(domainArb, async (host) => {
          // Override DNS to resolve to a well-known public IP (8.8.8.8)
          dns.promises.lookup = async () => [{ address: '8.8.8.8', family: 4 }];

          const url = `https://${host}/path`;
          const result = await validateUrl(url);
          expect(result.ok).toBe(true);
        }),
        { numRuns: 100 },
      );
    } finally {
      dns.promises.lookup = originalLookup;
    }
  });
});

// ─── Property 2: SSRF Blocked IP Ranges ──────────────────────────────────────
// Feature: showroom-external-api, Property 2: SSRF blocked IP ranges

describe('Property 2 — SSRF blocked IP ranges', () => {
  /**
   * For any IPv4 address in a private / blocked subnet, isBlockedIp MUST
   * return true.
   *
   * Validates: Requirements 2.1, 2.2
   */
  test('private-range IPv4 addresses are always blocked', () => {
    // Arbitraries for each private subnet

    // 10.0.0.0/8  — second, third, fourth octets are free
    const rfc1918_10 = fc.tuple(
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 }),
    ).map(([b, c, d]) => `10.${b}.${c}.${d}`);

    // 172.16.0.0/12 — second octet 16–31
    const rfc1918_172 = fc.tuple(
      fc.integer({ min: 16, max: 31 }),
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 }),
    ).map(([b, c, d]) => `172.${b}.${c}.${d}`);

    // 192.168.0.0/16
    const rfc1918_192 = fc.tuple(
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 }),
    ).map(([c, d]) => `192.168.${c}.${d}`);

    // 127.0.0.0/8  (loopback)
    const loopback = fc.tuple(
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 }),
    ).map(([b, c, d]) => `127.${b}.${c}.${d}`);

    // 169.254.0.0/16 (link-local)
    const linkLocal = fc.tuple(
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 }),
    ).map(([c, d]) => `169.254.${c}.${d}`);

    const privateIpArb = fc.oneof(
      rfc1918_10,
      rfc1918_172,
      rfc1918_192,
      loopback,
      linkLocal,
    );

    fc.assert(
      fc.property(privateIpArb, (ip) => {
        expect(isBlockedIp(ip)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * IPv6 loopback (::1) is always blocked.
   *
   * Validates: Requirements 2.1
   */
  test('IPv6 loopback (::1) is always blocked', () => {
    expect(isBlockedIp('::1')).toBe(true);
  });

  /**
   * For any IPv4 address outside all private / blocked ranges, isBlockedIp
   * MUST return false.
   *
   * Validates: Requirements 2.1, 2.2
   */
  test('public IPv4 addresses are never blocked', () => {
    // Generate IPs in well-known public octets (not reserved or private)
    // Safe public first-octets: 1–9, 11–126, 128–168, 170–171, 173–191, 193–223
    // We keep it simple: first octet from a curated list of clearly public ranges
    const publicFirstOctet = fc.oneof(
      fc.integer({ min: 1, max: 9 }),    // 1.x - 9.x
      fc.integer({ min: 11, max: 126 }), // 11.x - 126.x (avoids 10.x, 127.x)
      fc.integer({ min: 128, max: 168 }), // 128.x - 168.x (avoids 169.254)
      fc.integer({ min: 170, max: 171 }), // 170.x, 171.x
      fc.integer({ min: 173, max: 191 }), // 173.x - 191.x (avoids 172.16-31)
      fc.integer({ min: 193, max: 223 }), // 193.x - 223.x (avoids 192.168)
    );

    const publicIpArb = fc.tuple(
      publicFirstOctet,
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 }),
    ).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`)
     .filter(ip => isPublicIpv4(ip)); // belt-and-suspenders filter

    fc.assert(
      fc.property(publicIpArb, (ip) => {
        expect(isBlockedIp(ip)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Additional guard: the second-octet boundary for 172.16/12.
   * 172.15.x.x and 172.32.x.x are NOT blocked (outside the /12 range).
   *
   * Validates: Requirements 2.1
   */
  test('172.x.x.x addresses outside 172.16–172.31 are not blocked', () => {
    const outsideArb = fc.tuple(
      fc.oneof(
        fc.integer({ min: 0, max: 15 }),  // below 172.16
        fc.integer({ min: 32, max: 255 }), // above 172.31
      ),
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 }),
    ).map(([b, c, d]) => `172.${b}.${c}.${d}`);

    fc.assert(
      fc.property(outsideArb, (ip) => {
        expect(isBlockedIp(ip)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});
