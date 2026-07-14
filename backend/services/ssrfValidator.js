/**
 * ssrfValidator.js — SSRF protection service
 *
 * Validates URLs against SSRF attack vectors by:
 * 1. Enforcing HTTPS scheme
 * 2. Resolving DNS and blocking private/loopback/link-local IP ranges
 *
 * Uses Node built-ins only: dns.promises, net
 *
 * Exports:
 *   isBlockedIp(ip)          → boolean
 *   validateUrl(urlString)   → Promise<{ ok: boolean, error?: string }>
 */

'use strict';

const dns = require('dns');
const net = require('net');

/**
 * Parse an IPv4 address string into a 32-bit unsigned integer.
 * Returns null if the string is not a valid IPv4 address.
 *
 * @param {string} ip
 * @returns {number|null}
 */
function ipv4ToInt(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let num = 0;
  for (const part of parts) {
    const octet = parseInt(part, 10);
    if (isNaN(octet) || octet < 0 || octet > 255 || String(octet) !== part) return null;
    num = (num * 256) + octet;
  }
  // Treat as unsigned 32-bit
  return num >>> 0;
}

/**
 * Check whether an IP address string falls within a blocked range.
 *
 * Blocked ranges:
 *   - 10.0.0.0/8       (RFC-1918 private)
 *   - 172.16.0.0/12    (RFC-1918 private)
 *   - 192.168.0.0/16   (RFC-1918 private)
 *   - 127.0.0.0/8      (loopback)
 *   - 169.254.0.0/16   (link-local)
 *   - ::1              (IPv6 loopback)
 *   - "localhost"      (hostname alias — callers should resolve first, but guard here too)
 *
 * @param {string} ip — IPv4 dotted-decimal, IPv6 string, or "localhost"
 * @returns {boolean} true if the address is blocked
 */
function isBlockedIp(ip) {
  if (typeof ip !== 'string') return true; // treat unparseable input as blocked

  const normalised = ip.trim().toLowerCase();

  // Hostname alias
  if (normalised === 'localhost') return true;

  // IPv6 loopback
  if (normalised === '::1') return true;

  // IPv6 loopback full form
  if (normalised === '0:0:0:0:0:0:0:1') return true;

  // IPv4-mapped IPv6 addresses  e.g. ::ffff:127.0.0.1  or  ::ffff:7f00:1
  if (normalised.startsWith('::ffff:')) {
    const v4Part = normalised.slice(7);
    // Could be dotted-decimal (::ffff:127.0.0.1) or hex (::ffff:7f00:0001)
    if (net.isIPv4(v4Part)) {
      return isBlockedIp(v4Part);
    }
    // hex pair form: convert to dotted-decimal and recurse
    const hexParts = v4Part.split(':');
    if (hexParts.length === 2) {
      const high = parseInt(hexParts[0], 16);
      const low  = parseInt(hexParts[1], 16);
      if (!isNaN(high) && !isNaN(low)) {
        const dotted = [
          (high >>> 8) & 0xff,
           high        & 0xff,
          (low  >>> 8) & 0xff,
           low         & 0xff,
        ].join('.');
        return isBlockedIp(dotted);
      }
    }
  }

  // IPv4 checks
  if (net.isIPv4(normalised)) {
    const num = ipv4ToInt(normalised);
    if (num === null) return true; // unparseable → block

    // Use unsigned right-shift to keep all comparisons in unsigned 32-bit space.
    //
    // 10.0.0.0/8  →  10.0.0.0 – 10.255.255.255
    if ((num >>> 24) === 10) return true;

    // 172.16.0.0/12  →  172.16.0.0 – 172.31.255.255
    // Top 12 bits: 172 (8 bits) + upper 4 bits of second octet = 0b10101100_0001
    //   (num >> 20) & 0xFFF  →  should equal  (172 << 4) | 1  = 2753
    if (((num >>> 20) & 0xFFF) === ((172 << 4) | 1)) return true;

    // 192.168.0.0/16  →  192.168.0.0 – 192.168.255.255
    if ((num >>> 16) === ((192 << 8) | 168)) return true;

    // 127.0.0.0/8  →  127.0.0.0 – 127.255.255.255
    if ((num >>> 24) === 127) return true;

    // 169.254.0.0/16  →  169.254.0.0 – 169.254.255.255
    if ((num >>> 16) === ((169 << 8) | 254)) return true;

    return false;
  }

  // For IPv6 (non-loopback, non-mapped), treat as public
  if (net.isIPv6(normalised)) {
    return false;
  }

  // Unknown format — block to be safe
  return true;
}

/**
 * Validate a URL string for use as an external data source endpoint.
 *
 * Steps:
 *  1. Parse the URL — return { ok: false, error: 'malformed_url' } if invalid
 *  2. Check scheme is exactly 'https:' — return { ok: false, error: 'non_https_scheme' } if not
 *  3. Resolve the hostname via DNS (all addresses) — return { ok: false, error: 'dns_resolution_failed' } on failure
 *  4. Check every resolved address against isBlockedIp — return { ok: false, error: 'blocked_address' } if any blocked
 *  5. Return { ok: true }
 *
 * This function NEVER throws. All errors are captured and returned as { ok: false, error }.
 *
 * @param {string} urlString
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
async function validateUrl(urlString) {
  // Step 1: Parse
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    return { ok: false, error: 'malformed_url' };
  }

  // Step 2: HTTPS scheme check
  if (parsed.protocol !== 'https:') {
    return { ok: false, error: 'non_https_scheme' };
  }

  // Extract hostname (strip brackets from IPv6 literals like [::1])
  const hostname = parsed.hostname;

  // Step 3: If the hostname is itself an IP literal, check it directly
  // without a DNS round-trip
  if (net.isIPv4(hostname) || net.isIPv6(hostname)) {
    if (isBlockedIp(hostname)) {
      return { ok: false, error: 'blocked_address' };
    }
    return { ok: true };
  }

  // Also catch "localhost" before DNS
  if (hostname.toLowerCase() === 'localhost') {
    return { ok: false, error: 'blocked_address' };
  }

  // Step 4: DNS resolution
  let addresses;
  try {
    addresses = await dns.promises.lookup(hostname, { all: true });
  } catch {
    return { ok: false, error: 'dns_resolution_failed' };
  }

  if (!addresses || addresses.length === 0) {
    return { ok: false, error: 'dns_resolution_failed' };
  }

  // Step 5: Check every resolved address
  for (const { address } of addresses) {
    if (isBlockedIp(address)) {
      return { ok: false, error: 'blocked_address' };
    }
  }

  return { ok: true };
}

module.exports = { isBlockedIp, validateUrl };
