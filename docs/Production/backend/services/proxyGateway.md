# services/proxyGateway.ts - The Secured Egress Gateway (Patent 4 core)

## 1. What is this?

**Backend service.** fetchSection(showroomId,sectionKey,ip): load source + field mappings -> cache check -> rate limit -> re-validate URL against SSRF -> inject decrypted credentials (bearer / header / query) -> fetch with redirect:REJECTED + 10s timeout -> unwrap envelope (single-key array heuristic) -> apply dot-path mappings -> cache fresh copy (per-source TTL) AND 7-day last-known-good stale copy -> health record row per attempt.

## 2. Why does it exist?

fetchSection(showroomId,sectionKey,ip): load source + field mappings -> cache check -> rate limit -> re-validate URL against SSRF -> inject decrypted credentials (bearer / header / query) -> fetch with redirect:REJECTED + 10s timeout -> unwrap envelope (single-key array heuristic) -> apply dot-path mappings -> cache fresh copy (per-source TTL) AND 7-day last-known-good stale copy -> health record row per attempt. Failure paths serve STALE data flagged {stale:true} (route adds X-Stale header); circuit breaker opens after 5 consecutive failures for 5 min (half-open retry). Pure helpers (resolveDotPath, applyMappings) are unit+property tested. This file IS the flagship patent embodiment - keep changes reviewed.

## 3. What does it do?

fetchSection(showroomId,sectionKey,ip): load source + field mappings -> cache check -> rate limit -> re-validate URL against SSRF -> inject decrypted credentials (bearer / header / query) -> fetch with redirect:REJECTED + 10s timeout -> unwrap envelope (single-key array heuristic) -> apply dot-path mappings -> cache fresh copy (per-source TTL) AND 7-day last-known-good stale copy -> health record row per attempt. Failure paths serve STALE data flagged {stale:true} (route adds X-Stale header); circuit breaker opens after 5 consecutive failures for 5 min (half-open retry). Pure helpers (resolveDotPath, applyMappings) are unit+property tested. This file IS the flagship patent embodiment - keep changes reviewed.

## 4. What does it touch?

Inline references only — nothing external.
