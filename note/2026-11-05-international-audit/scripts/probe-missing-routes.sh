#!/usr/bin/env bash
# Re-checks frontend → backend calls that have no matching route, on the LOCAL backend only.
# Unauthenticated: an existing route answers 401; a missing route answers 404 NOT_FOUND.
#   bash note/2026-11-05-international-audit/scripts/probe-missing-routes.sh
set -euo pipefail
BASE="http://127.0.0.1:3001"   # local only — never point this at production
U=00000000-0000-4000-8000-000000000000
echo "# probe-missing-routes $(date -u +%FT%TZ) base=$BASE"
while read -r m p caller; do
  code=$(curl -s -o /dev/null -w '%{http_code}' -X "$m" -H 'Content-Type: application/json' -d '{}' "$BASE${p//:id/$U}")
  printf '%-6s %-42s %s  caller=%s\n' "$m" "$p" "$code" "$caller"
done <<'LIST'
POST /api/upload/multiple frontend-next/lib/uploadFile.ts:29
POST /api/upload frontend-next/lib/uploadFile.ts:18(control:exists)
POST /api/ai/generate-description frontend-next/views/ProductCreate.tsx:146
POST /api/ai/generate frontend-next(control:exists)
GET /api/delivery/:id frontend-next/views/Orders.tsx:69
POST /api/delivery/:id frontend-next/views/Orders.tsx:78
GET /api/delivery/order/:id backend(control:exists)
PUT /api/auth/update-name frontend-next/components/profile/AccountSettings.tsx:249
PUT /api/telegram/notifications frontend-next/components/settings/TelegramSettings.tsx:29
GET /api/devops/errors/stats frontend-next/views/DevOps.tsx
POST /api/devops/errors/resolve-all frontend-next/views/DevOps.tsx
POST /api/devops/errors/:id/to-ticket frontend-next/views/DevOps.tsx
GET /api/devops/versions/:id frontend-next/views/DevOps.tsx
GET /api/docs/library frontend-next/views/DevOps.tsx
GET /api/docs/search frontend-next/views/DevOps.tsx
GET /api/docs/file frontend-next/views/DevOps.tsx
GET /api/docs/notes frontend-next/views/DevOps.tsx
GET /api/docs/progress frontend-next/views/DevOps.tsx
GET /api/docs/implementation frontend-next/views/DevOps.tsx
GET /api/docs/strategy/versions frontend-next/views/DevOps.tsx
LIST
