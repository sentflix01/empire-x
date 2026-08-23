# db/seed.js - Demo Data Seeder
Creates verified accounts admin@nodbusiness.app/Admin1234! and test@nodbusiness.app/Test1234! plus products/showrooms/posts/tasks/courses demo content (is_seed=TRUE so REAL_MODE can hide them). Idempotent ON CONFLICT updates. Dev/staging only - never production (see TD-018 for credential hygiene).
