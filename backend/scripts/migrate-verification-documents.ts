/**
 * Moves identity documents uploaded before audit fix F-013 from public storage
 * into private storage, then deletes the public copies.
 *
 *   cd backend
 *   npx tsx scripts/migrate-verification-documents.ts           # dry run: counts only
 *   npx tsx scripts/migrate-verification-documents.ts --apply   # move the files
 *
 * Needs the same storage settings as the API (SUPABASE_URL, SUPABASE_STORAGE_KEY,
 * SUPABASE_BUCKET and a private PRIVATE_SUPABASE_BUCKET or RECEIPTS_SUPABASE_BUCKET).
 * Per row and column: copy into private storage → update the row only if it still
 * holds the same URL → delete the public copy. Safe to re-run: rows that already
 * hold a private reference are skipped. Never prints document URLs.
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import pool, { closeAllPools } from '../db/pool';
import { isPrivateRef, privateFilesAvailable, storePrivateFile } from '../lib/privateFiles';
import { deletePublicUpload, validateFileBytes } from '../middleware/upload';

const APPLY = process.argv.includes('--apply');
const COLUMNS = ['selfie_url', 'id_document_url'] as const;
const MIME_BY_EXT: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.heic': 'image/heic', '.heif': 'image/heif', '.pdf': 'application/pdf' };

async function download(url: string): Promise<{ buffer: Buffer; mime: string }> {
  const apiBase = (process.env.API_URL ?? 'http://localhost:3001').replace(/\/$/, '');
  const clean = url.split(/[?#]/)[0];
  if (clean.startsWith(`${apiBase}/uploads/`)) {
    const uploadDir = path.join(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads');
    const file = path.join(uploadDir, ...clean.slice(`${apiBase}/uploads/`.length).split('/').map(decodeURIComponent));
    if (!file.startsWith(uploadDir + path.sep)) throw new Error('unsafe local path');
    return { buffer: await fs.promises.readFile(file), mime: MIME_BY_EXT[path.extname(file).toLowerCase()] ?? 'application/octet-stream' };
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`download failed [${response.status}]`);
  const mime = (response.headers.get('content-type') ?? '').split(';')[0].trim() || MIME_BY_EXT[path.extname(clean).toLowerCase()] || 'application/octet-stream';
  return { buffer: Buffer.from(await response.arrayBuffer()), mime };
}

async function main(): Promise<void> {
  if (APPLY && !privateFilesAvailable()) {
    throw new Error('Private storage is not configured — set PRIVATE_SUPABASE_BUCKET (a private bucket) before --apply');
  }
  const { rows } = await pool.query<{ id: string; user_id: string; selfie_url: string | null; id_document_url: string | null }>(
    `SELECT id, user_id, selfie_url, id_document_url FROM verification_requests
      WHERE selfie_url ~* '^https?://' OR id_document_url ~* '^https?://'`,
  );
  const totals = { rows: rows.length, files: 0, moved: 0, publicCopiesDeleted: 0, failed: 0 };
  for (const row of rows) {
    for (const column of COLUMNS) {
      const url = row[column];
      if (!url || isPrivateRef(url)) continue;
      totals.files++;
      if (!APPLY) continue;
      try {
        const { buffer, mime } = await download(url);
        const mismatch = await validateFileBytes(buffer.subarray(0, 64), mime);
        if (mismatch) throw new Error('stored file is not a recognised photo or PDF');
        const ref = await storePrivateFile(`verification/${row.user_id}`, buffer, mime);
        const updated = await pool.query(
          `UPDATE verification_requests SET ${column} = $1, updated_at = NOW() WHERE id = $2 AND ${column} = $3`,
          [ref, row.id, url],
        );
        if (updated.rowCount !== 1) throw new Error('row changed during migration; left as is');
        totals.moved++;
        if (await deletePublicUpload(url)) totals.publicCopiesDeleted++;
      } catch (err) {
        totals.failed++;
        console.error(`request ${row.id} ${column}: ${(err as Error).message}`);
      }
    }
  }
  console.log(JSON.stringify({ mode: APPLY ? 'apply' : 'dry-run', ...totals }));
  if (!APPLY && totals.files) console.log('Run again with --apply to move these files into private storage.');
}

main()
  .catch((err) => { console.error((err as Error).message); process.exitCode = 1; })
  .finally(() => closeAllPools());
