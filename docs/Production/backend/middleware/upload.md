# middleware/upload.ts - File Upload Pipeline

## 1. What is this?

**HTTP middleware.** Multer + storage selection: Supabase Storage first, then Cloudflare R2, then local disk (dev).

## 2. Why does it exist?

Multer chooses Supabase Storage, Cloudflare R2, or local disk. It enforces an extension/MIME allowlist, a 10 MB default size limit, and magic-byte validation for images and PDFs. Video files currently rely on the MIME/extension allowlist. Demo cloud uploads require the separate Demo project's `DEMO_SUPABASE_URL`, `DEMO_SUPABASE_STORAGE_KEY`, and private `DEMO_SUPABASE_BUCKET`; uploads receive seven-day signed URLs. Demo uploads on R2 are rejected. Local Demo uploads use `uploads/demo/<sessionId>/uploads/` and signed application tokens; static delivery checks the exact asset, active Demo session, and expiry. Local files rejected by magic-byte validation are deleted immediately.

## 3. What does it do?

Uploads are exposed through `/api/upload`; route authentication and the verified demo-session middleware determine the storage boundary. Real uploads retain the public bucket/path. Demo bucket privacy is checked during startup when Demo is enabled. Supabase `sb_secret_...` keys are sent via `apikey` only; legacy service_role JWTs are supported with Bearer and `apikey` headers while migrating. File names are server-generated, demo session identifiers are validated as UUIDs before use in storage paths, and storage provider credentials remain server-side.

## 4. What does it touch?

Inline references only — nothing external.
