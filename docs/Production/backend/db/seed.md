# db/seed.js - Demo Data Seeder

## 1. What is this?

**Database layer module.** Creates verified accounts admin@nodbusiness.app/Admin1234! and test@nodbusiness.app/Test1234! plus products/showrooms/posts/tasks/courses demo content (is_seed=TRUE so REAL_MODE can hide them).

## 2. Why does it exist?

Creates verified accounts admin@nodbusiness.app/Admin1234! and test@nodbusiness.app/Test1234! plus products/showrooms/posts/tasks/courses demo content (is_seed=TRUE so REAL_MODE can hide them). Idempotent ON CONFLICT updates. Dev/staging only - never production (see TD-018 for credential hygiene).

## 3. What does it do?

Creates verified accounts admin@nodbusiness.app/Admin1234! and test@nodbusiness.app/Test1234! plus products/showrooms/posts/tasks/courses demo content (is_seed=TRUE so REAL_MODE can hide them). Idempotent ON CONFLICT updates. Dev/staging only - never production (see TD-018 for credential hygiene).

## 4. What does it touch?

Inline references only — nothing external.
