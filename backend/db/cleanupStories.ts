/**
 * cleanupStories.ts
 * Deletes expired stories from the DB and schedules itself every hour.
 * Called once from index.ts on server start.
 */
import pool from './pool';

function isNeonQuotaError(err: unknown): boolean {
  if (!err) return false;
  const message = String((err as Error)?.message ?? err).toLowerCase();
  const detail = String((err as { detail?: unknown })?.detail ?? '').toLowerCase();
  const code = String((err as { code?: unknown })?.code ?? '').toLowerCase();
  return (
    message.includes('compute time quota') ||
    message.includes('account or project has exceeded') ||
    detail.includes('compute time quota') ||
    (code.includes('57014') && message.includes('quota')) ||
    (message.includes('quota') && message.includes('neon'))
  );
}

async function deleteExpiredStories(): Promise<void> {
  try {
    const { rows } = await pool.query(
      "SELECT 1 FROM information_schema.tables WHERE table_name = 'stories'"
    );
    if (rows.length === 0) {
      // Stories table doesn't exist yet — skip cleanup silently.
      return;
    }

    const { rowCount } = await pool.query(
      'DELETE FROM stories WHERE expires_at <= NOW()'
    );
    if (rowCount && rowCount > 0) {
      console.log(`[stories] Cleaned up ${rowCount} expired story/stories`);
    }
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException & { code?: string }).code === '42P01') {
      // relation "stories" does not exist — skip cleanup silently.
      return;
    }
    if (isNeonQuotaError(err)) {
      console.warn('[stories] Cleanup skipped: Neon compute quota exhausted');
      return;
    }
    console.error('[stories] Cleanup error:', (err as Error).message);
  }
}

export function startStoriesCleanup(): void {
  // Run immediately on startup, then every hour
  deleteExpiredStories();
  setInterval(deleteExpiredStories, 60 * 60 * 1000);
}
