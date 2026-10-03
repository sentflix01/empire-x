require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { URL } = require('node:url');
const fs = require('node:fs/promises');
const path = require('node:path');

function identity(connectionString) {
  const u = new URL(connectionString);
  return `${u.hostname.replace(/^\[|\]$/g, '').toLowerCase()}:${u.port || '5432'}/${decodeURIComponent(u.pathname.replace(/^\//, ''))}`;
}

function databaseName(connectionString) {
  const url = new URL(connectionString);
  return decodeURIComponent(url.pathname.replace(/^\//, ''));
}

const realUrl = process.env.DATABASE_URL;
const demoUrl = process.env.DEMO_DATABASE_URL;
if (!realUrl || !demoUrl) {
  console.error('Refusing demo cleanup: DATABASE_URL and DEMO_DATABASE_URL are both required for target comparison.');
  process.exit(1);
}
if (identity(realUrl) === identity(demoUrl)) {
  console.error('Refusing demo cleanup: DEMO_DATABASE_URL resolves to the real database.');
  process.exit(1);
}

const execute = process.argv.includes('--execute');
const acknowledged = process.env.ALLOW_DEMO_CLEANUP === '1';
const targetArgument = process.argv.find((argument) => argument.startsWith('--database='))?.slice('--database='.length);
if (execute && (!acknowledged || !targetArgument || targetArgument !== databaseName(demoUrl))) {
  console.error('Refusing demo cleanup: execution requires ALLOW_DEMO_CLEANUP=1 and --database=<exact demo database name>.');
  process.exit(1);
}

console.log(`Demo cleanup target: ${identity(demoUrl)}`);
process.env.DATABASE_URL = demoUrl;
if (process.env.DEMO_DATABASE_URL_REQUIRE_TLS !== undefined) {
  process.env.DATABASE_URL_REQUIRE_TLS = process.env.DEMO_DATABASE_URL_REQUIRE_TLS;
}
if (process.env.DEMO_DB_TLS_REJECT_UNAUTHORIZED !== undefined) {
  process.env.DB_TLS_REJECT_UNAUTHORIZED = process.env.DEMO_DB_TLS_REJECT_UNAUTHORIZED;
}
process.env.DB_POOL_MAX = '1';
const pool = require('./poolJsShim.cjs');

async function removeDemoUploads(sessionId) {
  // Session IDs come from the demo_sessions table, but validate before using
  // them in a filesystem path or a storage prefix.
  if (!/^[a-zA-Z0-9_-]+$/.test(sessionId)) throw new Error('Invalid demo session ID for upload cleanup');
  const prefix = `demo/${sessionId}/`;
  const uploadRoot = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
  const localTarget = path.resolve(uploadRoot, 'demo', sessionId);
  if (!localTarget.startsWith(`${path.resolve(uploadRoot, 'demo')}${path.sep}`)) {
    throw new Error('Demo upload cleanup path escaped its configured upload directory');
  }
  await fs.rm(localTarget, { recursive: true, force: true });

  const candidates = [process.env.SUPABASE_API_URL, process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_URL];
  const projectUrl = candidates
    .map((value) => value?.match(/https:\/\/[a-z0-9]+\.supabase\.co/i)?.[0])
    .find(Boolean);
  if (projectUrl && process.env.SUPABASE_STORAGE_KEY && process.env.SUPABASE_BUCKET) {
    const response = await fetch(`${projectUrl.replace(/\/$/, '')}/storage/v1/object/${encodeURIComponent(process.env.SUPABASE_BUCKET)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_STORAGE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prefixes: [prefix] }),
    });
    if (!response.ok) throw new Error(`Supabase demo upload cleanup failed with HTTP ${response.status}`);
  }

  if (process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME) {
    const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
    });
    try {
      let continuationToken;
      do {
        const listed = await client.send(new ListObjectsV2Command({
          Bucket: process.env.R2_BUCKET_NAME,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }));
        const objects = (listed.Contents || []).filter((object) => object.Key).map((object) => ({ Key: object.Key }));
        if (objects.length) {
          await client.send(new DeleteObjectsCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Delete: { Objects: objects, Quiet: true },
          }));
        }
        continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
      } while (continuationToken);
    } finally {
      client.destroy();
    }
  }
}

async function cleanup() {
  const { rows: expired } = execute
    ? await pool.query(`UPDATE demo_sessions SET status='expired' WHERE status='active' AND expires_at <= NOW() RETURNING id`)
    : await pool.query(`SELECT id FROM demo_sessions WHERE status='active' AND expires_at <= NOW()`);
  const { rows: candidates } = await pool.query(
    `SELECT id, user_id, status FROM demo_sessions
     WHERE status IN ('ended', 'expired')
        OR (status = 'cleaned' AND cleanup_error IS NOT NULL)
        OR (status = 'active' AND expires_at <= NOW())
     ORDER BY ended_at NULLS FIRST, expires_at
     LIMIT 100`,
  );
  if (!execute) {
    console.log(`Dry run: ${candidates.length} ended/expired sessions or pending upload cleanups are eligible. Set ALLOW_DEMO_CLEANUP=1 and pass --execute --database=${databaseName(demoUrl)} to proceed.`);
    return;
  }
  let cleaned = 0;
  let failed = 0;
  for (const session of candidates) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (session.status !== 'cleaned') {
        await client.query('DELETE FROM demo_session_ai_usage WHERE session_id=$1', [session.id]);
        const removedUser = await client.query(
          'DELETE FROM users WHERE id=$1 AND is_demo=TRUE AND is_seed=FALSE',
          [session.user_id],
        );
        if (removedUser.rowCount !== 1) throw new Error('temporary demo user was missing or did not pass the cleanup ownership checks');
        // External storage deletion cannot participate in a PostgreSQL
        // transaction. Commit the DB cleanup first and retry object deletion
        // idempotently when this marker remains set after a failure.
        await client.query(
          "UPDATE demo_sessions SET status='cleaned', cleaned_at=NOW(), cleanup_error='upload_cleanup_pending' WHERE id=$1",
          [session.id],
        );
      }
      await client.query('COMMIT');
      await removeDemoUploads(session.id);
      await pool.query('UPDATE demo_sessions SET cleanup_error=NULL WHERE id=$1 AND status=\'cleaned\'', [session.id]);
      cleaned += 1;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      await pool.query('UPDATE demo_sessions SET cleanup_error=$2 WHERE id=$1', [session.id, String(error.message).slice(0, 1000)]).catch(() => undefined);
      failed += 1;
      console.error(`Could not clean demo session ${session.id}: ${error.message}`);
    } finally {
      client.release();
    }
  }
  console.log(`Demo cleanup complete: expired=${expired.length}, cleaned=${cleaned}, failed=${failed}, remaining=${Math.max(0, candidates.length-cleaned-failed)}`);
  if (failed) process.exitCode = 2;
}

cleanup().catch((error) => {
  console.error(`Demo cleanup failed: ${error.message}`);
  process.exitCode = 1;
}).finally(() => pool.end());
