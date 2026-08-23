# db/migrate*.js - Schema Migrations Registry (34 files, grouped)

## 1. What is this?

**Database layer module.** Full registry with per-file purpose lives in docs/backend/DATABASE.md (authoritative).

## 2. Why does it exist?

Full registry with per-file purpose lives in docs/backend/DATABASE.md (authoritative). Highlights: migrate.js+migrate2 core tables; 8 indexes; 9 Chapa column; 10 external-source trio; 13 verification_requests; 20/22 Stripe status constraints (+repair); 27 threaded comments; 28 ban columns; 29 app_settings KV; 30 error_events; 31 conversation_participants junction; 32 FTS tsvector; 33 FK scalability indexes.

## 3. What does it do?

Full registry with per-file purpose lives in docs/backend/DATABASE.md (authoritative). Highlights: migrate.js+migrate2 core tables; 8 indexes; 9 Chapa column; 10 external-source trio; 13 verification_requests; 20/22 Stripe status constraints (+repair); 27 threaded comments; 28 ban columns; 29 app_settings KV; 30 error_events; 31 conversation_participants junction; 32 FTS tsvector; 33 FK scalability indexes.

## 4. What does it touch?

Inline references only — nothing external.
