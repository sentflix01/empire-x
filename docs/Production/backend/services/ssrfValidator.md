# services/ssrfValidator.ts - SSRF Protection

## 1. What is this?

**Backend service.** validateUrl(): HTTPS-only; literal IPs checked directly; hostnames DNS-resolved then EVERY address tested by isBlockedIp().

## 2. Why does it exist?

validateUrl(): HTTPS-only; literal IPs checked directly; hostnames DNS-resolved then EVERY address tested by isBlockedIp(). Blocks IPv4 0/8,10/8,127/8,169.254/16,172.16/12,192.168/16,100.64/10 CGNAT; IPv6 ::1, fc00::/7 ULA, fe80::/10 link-local, ff00::/8 multicast, NAT64 64:ff9b, and IPv4-mapped recursion; unknown formats fail CLOSED. Shields the proxy gateway from tenant-registered endpoints reaching internal networks. Property-tested.

## 3. What does it do?

validateUrl(): HTTPS-only; literal IPs checked directly; hostnames DNS-resolved then EVERY address tested by isBlockedIp(). Blocks IPv4 0/8,10/8,127/8,169.254/16,172.16/12,192.168/16,100.64/10 CGNAT; IPv6 ::1, fc00::/7 ULA, fe80::/10 link-local, ff00::/8 multicast, NAT64 64:ff9b, and IPv4-mapped recursion; unknown formats fail CLOSED. Shields the proxy gateway from tenant-registered endpoints reaching internal networks. Property-tested.

## 4. What does it touch?

Inline references only — nothing external.
