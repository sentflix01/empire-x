# middleware/auth.ts - JWT Authentication Core

## 1. What is this?

**HTTP middleware.** verifyAccessToken(): signature check PLUS type==access enforcement (refresh tokens never work as Bearer).

## 2. Why does it exist?

verifyAccessToken(): signature check PLUS type==access enforcement (refresh tokens never work as Bearer). requireAuth: token -> Redis revocation (revoked:{jti}, revoke_before:{userId}; fail-open if Redis down) -> 60s-cached user lookup -> rejects deleted/banned -> req.user. optionalAuth = silent version. requireAdmin gates role. invalidateUserCache evicts on ban/role change. Socket handshakes reuse verifyAccessToken with a fail-CLOSED revocation check. See backend/SECURITY.md.

## 3. What does it do?

verifyAccessToken(): signature check PLUS type==access enforcement (refresh tokens never work as Bearer). requireAuth: token -> Redis revocation (revoked:{jti}, revoke_before:{userId}; fail-open if Redis down) -> 60s-cached user lookup -> rejects deleted/banned -> req.user. optionalAuth = silent version. requireAdmin gates role. invalidateUserCache evicts on ban/role change. Socket handshakes reuse verifyAccessToken with a fail-CLOSED revocation check. See backend/SECURITY.md.

## 4. What does it touch?

Inline references only — nothing external.
