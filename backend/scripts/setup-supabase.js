/**
 * setup-supabase.js
 * Creates the Supabase Storage bucket and sets it to public.
 * Run once: node scripts/setup-supabase.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const URL    = process.env.SUPABASE_URL?.replace(/\/$/, '');
const KEY    = process.env.SUPABASE_STORAGE_KEY;
const BUCKET = process.env.SUPABASE_BUCKET;

if (!URL || !KEY || !BUCKET) {
  console.error('❌  Missing SUPABASE_URL / SUPABASE_STORAGE_KEY / SUPABASE_BUCKET in .env');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
};

async function run() {
  console.log(`\n🔧  Supabase project : ${URL}`);
  console.log(`🪣  Bucket           : ${BUCKET}\n`);

  // ── 1. Check if bucket already exists ─────────────────────────────────────
  const checkRes = await fetch(`${URL}/storage/v1/bucket/${BUCKET}`, { headers });
  const checkBody = await checkRes.json();

  if (checkRes.ok) {
    console.log(`✅  Bucket "${BUCKET}" already exists.`);
    if (!checkBody.public) {
      // Make it public
      const patchRes = await fetch(`${URL}/storage/v1/bucket/${BUCKET}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ public: true }),
      });
      if (patchRes.ok) console.log('✅  Bucket updated to public.');
      else console.warn('⚠️   Could not set bucket to public:', await patchRes.text());
    } else {
      console.log('✅  Bucket is already public.');
    }
  } else if (checkRes.status === 400 || checkRes.status === 404) {
    // ── 2. Create bucket ─────────────────────────────────────────────────────
    console.log(`📦  Creating bucket "${BUCKET}"...`);
    const createRes = await fetch(`${URL}/storage/v1/bucket`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
    });
    const createBody = await createRes.json();
    if (createRes.ok || createRes.status === 409) {
      console.log('✅  Bucket created successfully and set to public.');
    } else {
      console.error('❌  Failed to create bucket:', createBody);
      process.exit(1);
    }
  } else {
    console.error('❌  Unexpected response checking bucket:', checkRes.status, checkBody);
    process.exit(1);
  }

  // ── 3. Upload test file ───────────────────────────────────────────────────
  console.log('\n📤  Testing upload with a 1×1 PNG...');
  const pngBuf = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );
  const key = `uploads/setup-test-${Date.now()}.png`;
  const uploadRes = await fetch(`${URL}/storage/v1/object/${BUCKET}/${key}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'image/png',
      'x-upsert': 'true',
    },
    body: pngBuf,
    duplex: 'half',
  });

  if (uploadRes.ok) {
    const publicUrl = `${URL}/storage/v1/object/public/${BUCKET}/${key}`;
    console.log('✅  Test upload succeeded!');
    console.log(`🔗  Public URL: ${publicUrl}`);
  } else {
    const err = await uploadRes.text();
    console.error('❌  Upload test failed:', uploadRes.status, err);
    process.exit(1);
  }

  console.log('\n🎉  Supabase Storage is ready! Profile picture uploads will now work.\n');
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
