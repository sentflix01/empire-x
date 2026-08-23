/**
 * services/ssrfValidator.ts — SSRF protection service
 *
 * Validates URLs against SSRF attack vectors:
 *   1. Enforces HTTPS scheme
 *   2. Resolves DNS and blocks private/loopback/link-local IP ranges
 */
import dns from 'dns';
import net from 'net';

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let num = 0;
  for (const part of parts) {
    const octet = parseInt(part, 10);
    if (isNaN(octet) || octet < 0 || octet > 255 || String(octet) !== part) return null;
    num = (num * 256) + octet;
  }
  return num >>> 0;
}

/**
 * Expand an IPv6 address into its 8 hextets (numbers). Returns null for
 * malformed input. Handles "::" compression and embedded IPv4 tails.
 */
function ipv6ToHextets(ip: string): number[] | null {
  let head = ip;
  let tail: string[] = [];
  const v4Match = head.match(/^(.*):(\d+\.\d+\.\d+\.\d+)$/);
  if (v4Match) {
    const n = ipv4ToInt(v4Match[2]);
    if (n === null) return null;
    tail = [String((n >>> 16) & 0xffff), String(n & 0xffff)];
    head = v4Match[1] || '';
  }
  const doubleColon = head.split('::');
  if (doubleColon.length > 2) return null;
  const headParts = doubleColon[0] ? doubleColon[0].split(':') : [];
  const tailParts = (doubleColon[1] ?? '').length || doubleColon.length === 1
    ? (doubleColon[1] ? doubleColon[1].split(':') : [])
    : [];
  if (headParts.some(p => !/^[0-9a-f]{1,4}$/i.test(p))) return null;
  if (tailParts.some(p => !/^[0-9a-f]{1,4}$/i.test(p))) return null;
  const missing = 8 - headParts.length - tailParts.length - tail.length;
  if (doubleColon.length === 2) {
    if (missing < 0) return null;
  } else if (missing !== 0) {
    return null;
  }
  const zeros = doubleColon.length === 2 ? new Array(missing).fill(0) : [];
  return [...headParts, ...zeros, ...tailParts, ...tail].map(h => parseInt(h, 16));
}

export function isBlockedIp(ip: string): boolean {
  if (typeof ip !== 'string') return true;
  const n = ip.trim().toLowerCase();
  if (!n || n === 'localhost') return true;
  if (n === '::1' || n === '0:0:0:0:0:0:0:1') return true;
  // IPv4-mapped IPv6 (::ffff:a.b.c.d) — validate the embedded v4 address.
  if (n.startsWith('::ffff:')) {
    const v4 = n.slice(7);
    if (net.isIPv4(v4)) return isBlockedIp(v4);
    const parts = v4.split(':');
    if (parts.length === 2) {
      const high = parseInt(parts[0], 16), low = parseInt(parts[1], 16);
      if (!isNaN(high) && !isNaN(low)) {
        return isBlockedIp([(high>>>8)&0xff, high&0xff, (low>>>8)&0xff, low&0xff].join('.'));
      }
    }
  }
  if (net.isIPv4(n)) {
    const num = ipv4ToInt(n);
    if (num === null) return true;
    if ((num>>>24) === 0) return true;                          // 0.0.0.0/8 "this network"
    if ((num>>>24) === 10) return true;                         // RFC1918 10/8
    if (((num>>>20)&0xFFF) === ((172<<4)|1)) return true;       // RFC1918 172.16/12
    if ((num>>>16) === ((192<<8)|168)) return true;             // RFC1918 192.168/16
    if ((num>>>24) === 127) return true;                        // loopback
    if ((num>>>16) === ((169<<8)|254)) return true;             // link-local 169.254/16
    if (((num>>>22)&0x3F) === 100 && ((num>>>16)&0xFF) >= 64 && ((num>>>16)&0xFF) <= 127) return true; // CGNAT 100.64/10
    return false;
  }
  if (net.isIPv6(n)) {
    const hex = ipv6ToHextets(n);
    if (!hex) return true; // unparseable — fail closed
    // Unspecified address ::/128
    if (hex.every(h => h === 0)) return true;
    // Loopback handled above; unique-local fc00::/7 (fc00–fdff)
    if (hex[0] >= 0xfc00 && hex[0] <= 0xfdff) return true;
    // Link-local fe80::/10 (fe80–febf)
    if (hex[0] >= 0xfe80 && hex[0] <= 0xfebf) return true;
    // Multicast ff00::/8
    if ((hex[0] & 0xff00) === 0xff00) return true;
    // NAT64 well-known prefix 64:ff9b::/96 can reach IPv4 literals — treat as blocked
    if (hex[0] === 0x0064 && hex[1] === 0xff9b) return true;
    // IPv4/IPv6 translation (rfc6052) 0064:ff9b:1::/48
    if (hex[0] === 0x0064 && hex[1] === 0xff9b && hex[2] === 0x0001) return true;
    return false;
  }
  return true; // unknown format — block
}

export async function validateUrl(urlString: string): Promise<ValidationResult> {
  let parsed: URL;
  try { parsed = new URL(urlString); } catch { return { ok: false, error: 'malformed_url' }; }
  if (parsed.protocol !== 'https:') return { ok: false, error: 'non_https_scheme' };
  const hostname = parsed.hostname;
  if (net.isIPv4(hostname) || net.isIPv6(hostname)) {
    return isBlockedIp(hostname) ? { ok: false, error: 'blocked_address' } : { ok: true };
  }
  if (hostname.toLowerCase() === 'localhost') return { ok: false, error: 'blocked_address' };
  let addresses: dns.LookupAddress[];
  try { addresses = await dns.promises.lookup(hostname, { all: true }); } catch { return { ok: false, error: 'dns_resolution_failed' }; }
  if (!addresses?.length) return { ok: false, error: 'dns_resolution_failed' };
  for (const { address } of addresses) {
    if (isBlockedIp(address)) return { ok: false, error: 'blocked_address' };
  }
  return { ok: true };
}

module.exports = { isBlockedIp, validateUrl };
