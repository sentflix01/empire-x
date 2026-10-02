# middleware/upload.ts - File Upload Pipeline

## 1. What is this?

**HTTP middleware.** Multer + storage selection: Supabase Storage first, then Cloudflare R2, then local disk (dev).

## 2. Why does it exist?

Multer chooses Supabase Storage, Cloudflare R2, or local disk. It enforces an extension/MIME allowlist, a 10 MB default size limit, and magic-byte validation for images and PDFs. Video files currently rely on the MIME/extension allowlist. Track 2 demo uploads are written beneath `demo/<sessionId>/uploads/` in cloud storage and `uploads/demo/<sessionId>/` locally so session cleanup can remove them. Local files rejected by magic-byte validation are deleted immediately.

## 3. What does it do?

Uploads are exposed through `/api/upload`; route authentication and the verified demo-session middleware determine the optional session prefix. Real and Track 1 uploads retain the standard `uploads/` path. File names are server-generated, demo session identifiers are validated as UUIDs before use in storage paths, and storage provider credentials remain server-side.

## 4. What does it touch?

Inline references only — nothing external.
