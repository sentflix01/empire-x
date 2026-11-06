/**
 * lib/storedFiles.ts — deletes files a person uploaded, given the references
 * stored in their rows: private refs ("private:…") and public upload URLs.
 * Used after account deletion (audit F-014). Never throws: storage failures
 * are logged and reported so a retry or a manual clean-up can follow.
 */
import logger from './logger';
import { deletePrivateFile, isPrivateRef } from './privateFiles';
import { deletePublicUpload } from '../middleware/upload';

export interface FileDeletionReport { deleted: number; external: number; failed: number }

export async function deleteStoredFiles(refs: Array<string | null | undefined>): Promise<FileDeletionReport> {
  const report: FileDeletionReport = { deleted: 0, external: 0, failed: 0 };
  const unique = [...new Set(refs.filter((r): r is string => typeof r === 'string' && r.trim() !== ''))];
  for (const ref of unique) {
    try {
      if (isPrivateRef(ref)) { await deletePrivateFile(ref); report.deleted++; continue; }
      if (await deletePublicUpload(ref)) report.deleted++;
      else report.external++;
    } catch (err) {
      report.failed++;
      // Log the kind of reference, never the URL itself (it may grant access).
      logger.error({ err: (err as Error).message, private: isPrivateRef(ref) }, 'stored file deletion failed');
    }
  }
  return report;
}
