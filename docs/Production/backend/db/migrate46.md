# `backend/db/migrate46.js`

Adds nullable `users.workspace_owner_id` metadata for explicit links from an
isolated Demo workspace identity to its canonical Real user ID. Existing rows
are intentionally left unmapped; the application must not infer ownership from
matching email addresses. The Demo workspace switch creates a linked shadow
identity only when the canonical Real ID and email are verified and no
conflicting Demo row exists.

Run this migration in the Real schema and the Demo schema before enabling the
workspace switch endpoint. On one Supabase database, use the restricted schema
owner/migration credentials and explicitly select the intended schema.
