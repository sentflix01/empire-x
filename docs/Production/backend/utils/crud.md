# utils/crud.ts - Generic CRUD Helpers (SQL-Safety Core)

## 1. What is this?

**Shared utility.** Every simple route reads/writes through here instead of hand-writing SQL.

## 2. Why does it exist?

Every simple route reads/writes through here instead of hand-writing SQL. validateTable(): ALLOWED_TABLES allowlist (50+ tables) blocks injection via table names. buildWhere()/parseSort() sanitize identifiers to [a-z0-9_]. createRecord/updateRecord sanitize DATA KEYS via sanitizeColumn() - a client sending {"status=$1--":...} cannot inject; values always $N parameters. listRecords caps LIMIT at 500. Exports both ESM and module.exports for legacy requires. Related: backend/DATABASE.md, THREAT_MODEL injection table.

## 3. What does it do?

Every simple route reads/writes through here instead of hand-writing SQL.
validateTable(): ALLOWED_TABLES allowlist (50+ tables) blocks injection via table names. buildWhere()/parseSort() sanitize identifiers to [a-z0-9_]. createRecord/updateRecord sanitize DATA KEYS via sanitizeColumn() - a client sending {"status=$1--":...} cannot inject; values always $N parameters. listRecords caps LIMIT at 500. Exports both ESM and module.exports for legacy requires. Related: backend/DATABASE.md, THREAT_MODEL injection table.

## 4. What does it touch?

Inline references only — nothing external.
