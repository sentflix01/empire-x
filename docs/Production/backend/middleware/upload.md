# middleware/upload.ts - File Upload Pipeline

## 1. What is this?

**HTTP middleware.** Multer + storage selection: Supabase Storage first, then Cloudflare R2, then local disk (dev).

## 2. Why does it exist?

Multer + storage selection: Supabase Storage first, then Cloudflare R2, then local disk (dev). MIME x extension cross-checked allowlist (jpg/png/gif/webp/avif/heic/svg/pdf/mp4/webm/mov), MAX_FILE_SIZE_MB default 10MB, server-generated filenames prevent traversal. Known gaps: TD-017 (SVG sanitize, magic bytes). Consumed by routes/upload.

## 3. What does it do?

Multer + storage selection: Supabase Storage first, then Cloudflare R2, then local disk (dev). MIME x extension cross-checked allowlist (jpg/png/gif/webp/avif/heic/svg/pdf/mp4/webm/mov), MAX_FILE_SIZE_MB default 10MB, server-generated filenames prevent traversal. Known gaps: TD-017 (SVG sanitize, magic bytes). Consumed by routes/upload.

## 4. What does it touch?

Inline references only — nothing external.
