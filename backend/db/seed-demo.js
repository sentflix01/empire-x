/** Seed a small, idempotent user/business fixture into the isolated Demo DB. */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { URL } = require('node:url');
const { Pool } = require('pg');
const fs = require('node:fs');
const fixtures = require('./demo-fixtures.cjs');

function identity(raw) {
  const url = new URL(raw);
  return `${url.hostname.replace(/^\[|\]$/g, '').toLowerCase()}:${url.port || '5432'}/${decodeURIComponent(url.pathname.replace(/^\//, ''))}`;
}

function name(raw) {
  return decodeURIComponent(new URL(raw).pathname.replace(/^\//, ''));
}

function role(raw) {
  return decodeURIComponent(new URL(raw).username);
}

const demoUrl = process.env.DEMO_DATABASE_URL;
const realUrl = process.env.DATABASE_URL;
const dbArg = process.argv.find((arg) => arg.startsWith('--database='))?.slice('--database='.length);
const sharedDatabase = Boolean(demoUrl && realUrl && identity(demoUrl) === identity(realUrl));
const demoSchema = process.env.DEMO_DB_SCHEMA || (sharedDatabase ? '' : 'public');
const realSchema = process.env.DATABASE_SCHEMA || 'public';
if (!demoUrl || !realUrl || (sharedDatabase && (!demoSchema || demoSchema === realSchema || role(demoUrl) === role(realUrl)))) {
  console.error('Refusing Demo seed: use separate databases, or configure a separate schema and restricted role for Demo.');
  process.exit(1);
}
const schemaArg = process.argv.find((arg) => arg.startsWith('--schema='))?.slice('--schema='.length);
if (process.env.ALLOW_DEMO_SEED !== '1' || !process.argv.includes('--execute') || dbArg !== name(demoUrl) || (sharedDatabase && schemaArg !== demoSchema)) {
  console.error(`Refusing Demo seed: set ALLOW_DEMO_SEED=1 and pass --execute --database=<exact Demo database name>${sharedDatabase ? ' --schema=<exact Demo schema>' : ''}.`);
  process.exit(1);
}

const demoConnection = new URL(demoUrl);
demoConnection.searchParams.set('options', `-c search_path=${demoSchema},pg_catalog`);
const tlsOverride = process.env.DEMO_DATABASE_URL_REQUIRE_TLS;
const remote = !['localhost', '127.0.0.1', '::1', 'postgres'].includes(demoConnection.hostname.replace(/^\[|\]$/g, '').toLowerCase());
const needsSsl = tlsOverride === 'true' || (tlsOverride !== 'false' && (process.env.NODE_ENV === 'production' || remote)) ||
  /supabase\.co|supabase\.com|sslmode=require|ssl=true/i.test(demoUrl);
const caFile = process.env.DEMO_DB_SSL_CA_FILE;
if (needsSsl) {
  demoConnection.searchParams.set('sslmode', 'verify-full');
  if (caFile) demoConnection.searchParams.set('sslrootcert', caFile);
}
const pool = new Pool({
  connectionString: demoConnection.toString(),
  ssl: needsSsl ? { rejectUnauthorized: true, ...(caFile ? { ca: fs.readFileSync(caFile, 'utf8') } : {}) } : false,
  max: 1,
});
async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const fixture of fixtures) {
      const sections = [
        { type: 'hero', title: fixture.business, subtitle: fixture.description, cta: fixture.products?.length ? 'Browse catalog' : 'Explore services' },
        { type: 'about', aboutTitle: 'About us', aboutDesc: fixture.about, aboutImage: fixture.cover },
      ];
      if (fixture.products?.length) {
        sections.push({ type: 'products', title: fixture.catalogTitle || 'Browse the catalog', enableSearch: true });
      }
      if (fixture.services?.length) {
        sections.push({ type: 'services', servTitle: fixture.servicesTitle || 'Services', services: fixture.services });
      }
      if (fixture.booking) {
        sections.push({
          type: 'booking',
          bookingTitle: fixture.booking.title,
          bookingDesc: fixture.booking.description,
          bookingBtn: fixture.booking.button,
          requestName: fixture.booking.requestName,
        });
      }
      sections.push({
        type: 'contact',
        title: 'Contact',
        email: fixture.email,
        phone: fixture.phone,
        location: fixture.location,
      });
      // Feed announcement ticker — renders at the bottom of the business card in the feed.
      if (fixture.ticker?.text) {
        sections.push({
          type: 'feed_ticker',
          tickerText: fixture.ticker.text,
          tickerType: fixture.ticker.type || 'auto',
        });
      }
      const { rows: userRows } = await client.query(
        `INSERT INTO users (email, full_name, role, is_verified, is_demo, is_seed, provider)
         VALUES ($1, $2, 'user', TRUE, TRUE, FALSE, 'local')
         ON CONFLICT (email) DO UPDATE SET full_name=EXCLUDED.full_name, is_demo=TRUE, is_seed=FALSE
         RETURNING id`,
        [fixture.email, fixture.name],
      );
      const userId = userRows[0].id;
      const { rows: profiles } = await client.query('SELECT id FROM user_profiles WHERE user_id=$1 LIMIT 1', [userId]);
      if (profiles[0]) {
        await client.query(
          `UPDATE user_profiles SET display_name=$2, bio=$3, avatar_url=$4, cover_url=$5,
             profile_type='personal', headline=$6, location=$7, phone=$8, has_business_profile=TRUE,
             business_name=$9, business_category=$10, business_template=$11, business_description=$12,
             business_logo_url=$13, business_cover_url=$14, business_sections=$15, business_theme_color=$16,
             business_contact_email=$17, business_contact_phone=$8, business_address=$7,
             business_hours=$18, updated_at=NOW()
           WHERE id=$1`,
          [
            profiles[0].id, fixture.name, fixture.bio, fixture.avatar, fixture.cover, fixture.headline,
            fixture.location, fixture.phone, fixture.business, fixture.category, fixture.template,
            fixture.description, fixture.logo, fixture.cover, JSON.stringify(sections), fixture.themeColor,
            fixture.email, JSON.stringify(fixture.hours || []),
          ],
        );
      } else {
        await client.query(
          `INSERT INTO user_profiles (user_id, display_name, profile_type, has_business_profile, business_name,
             business_category, business_template, business_description, bio, avatar_url, cover_url, headline,
             location, phone, business_logo_url, business_cover_url, business_sections, business_theme_color,
             business_contact_email, business_contact_phone, business_address, business_hours)
           VALUES ($1, $2, 'personal', TRUE, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $12, $11, $18)`,
          [
            userId, fixture.name, fixture.business, fixture.category, fixture.template, fixture.description,
            fixture.bio, fixture.avatar, fixture.cover, fixture.headline, fixture.location, fixture.phone,
            fixture.logo, fixture.cover, JSON.stringify(sections), fixture.themeColor, fixture.email,
            JSON.stringify(fixture.hours || []),
          ],
        );
      }
      await client.query(
        `UPDATE businesses SET business_category=$3, business_template=$4, business_description=$5,
           business_logo_url=$6, business_cover_url=$7, business_sections=$8, business_theme_color=$9,
           business_contact_email=$10, business_contact_phone=$11, business_address=$12,
           business_hours=$13, updated_at=NOW()
         WHERE owner_id=$1 AND business_name=$2`,
        [
          userId, fixture.business, fixture.category, fixture.template, fixture.description,
          fixture.logo, fixture.cover, JSON.stringify(sections), fixture.themeColor,
          fixture.email, fixture.phone, fixture.location, JSON.stringify(fixture.hours || []),
        ],
      );
      await client.query(
        `INSERT INTO businesses (owner_id, business_name, business_category, business_template, business_description,
           business_logo_url, business_cover_url, business_sections, business_theme_color,
           business_contact_email, business_contact_phone, business_address, business_hours)
         SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
         WHERE NOT EXISTS (SELECT 1 FROM businesses WHERE owner_id=$1 AND business_name=$2)`,
        [
          userId, fixture.business, fixture.category, fixture.template, fixture.description,
          fixture.logo, fixture.cover, JSON.stringify(sections), fixture.themeColor,
          fixture.email, fixture.phone, fixture.location, JSON.stringify(fixture.hours || []),
        ],
      );
      const { rows: savedBusinesses } = await client.query(
        'SELECT id FROM businesses WHERE owner_id=$1 AND business_name=$2 ORDER BY created_at LIMIT 1',
        [userId, fixture.business],
      );
      const businessId = savedBusinesses[0]?.id;
      if (!businessId) throw new Error(`Could not resolve Demo business ${fixture.business}`);

      // Demo showcases need public visibility, but this fixture never creates
      // provider-backed billing and is safe only in the isolated Demo database.
      await client.query(
        `INSERT INTO business_subscriptions
           (business_id, tier, status, current_period_start, current_period_end)
         VALUES ($1, 'premium', 'active', NOW(), NOW() + INTERVAL '365 days')
         ON CONFLICT (business_id) DO UPDATE SET
           tier = EXCLUDED.tier,
           status = EXCLUDED.status,
           current_period_start = COALESCE(business_subscriptions.current_period_start, EXCLUDED.current_period_start),
           current_period_end = GREATEST(COALESCE(business_subscriptions.current_period_end, EXCLUDED.current_period_end), EXCLUDED.current_period_end)
         WHERE business_subscriptions.stripe_subscription_id IS NULL`,
        [businessId],
      );

      // Provide actual read-only discovery content for the anonymous Demo
      // workspace. Deterministic slugs/content make reruns idempotent and keep
      // these fixtures distinct from real accounts and production seed rows.
      const slug = `demo-${fixture.business.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      const { rows: showroomRows } = await client.query(
        `INSERT INTO showrooms (owner_id, business_id, title, description, slug, category, template, sections,
           cover_image, logo_url, theme_color, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'published')
         ON CONFLICT (slug) DO UPDATE SET business_id=EXCLUDED.business_id, title=EXCLUDED.title,
           description=EXCLUDED.description, category=EXCLUDED.category, template=EXCLUDED.template,
           sections=EXCLUDED.sections, cover_image=EXCLUDED.cover_image, logo_url=EXCLUDED.logo_url,
           theme_color=EXCLUDED.theme_color, status='published', updated_at=NOW()
         RETURNING id`,
        [
          userId, businessId, fixture.business, fixture.description, slug, fixture.category,
          fixture.template, JSON.stringify(sections), fixture.cover, fixture.logo, fixture.themeColor,
        ],
      );
      const showroomId = showroomRows[0].id;

      const posts = [
        {
          content: `Hello from ${fixture.name}. ${fixture.bio}`,
          imageUrl: fixture.avatar,
        },
        ...fixture.posts.slice(0, 2).map((content) => ({ content, imageUrl: fixture.cover })),
      ];
      for (const post of posts) {
        await client.query(
          `INSERT INTO posts (author_id, author_name, content, image_url, post_type)
           SELECT $1,$2,$3,$4,'image'
           WHERE NOT EXISTS (SELECT 1 FROM posts WHERE author_id=$1 AND content=$3)`,
          [userId, fixture.name, post.content, post.imageUrl],
        );
      }

      const firstProduct = fixture.products?.[0];
      if (firstProduct) {
        await client.query(
          `UPDATE products SET title=$3, description=$4, price=$5, currency='ETB', stock=12,
             images=$6, category=$7, tags=$8, status='active', updated_at=NOW()
           WHERE business_id=$1 AND title=$2
             AND description LIKE 'Sample product or service from %'
             AND NOT EXISTS (SELECT 1 FROM products WHERE business_id=$1 AND title=$3)`,
          [
            businessId, `${fixture.business} featured offer`, firstProduct.title, firstProduct.description,
            firstProduct.price, JSON.stringify([fixture.cover]), firstProduct.category,
            `demo,${firstProduct.category.toLowerCase()}`,
          ],
        );
      }

      for (const item of fixture.products || []) {
        const values = [
          userId, businessId, showroomId, item.title, item.description, item.price,
          JSON.stringify([item.image || fixture.cover]), item.category, `demo,${item.category.toLowerCase()}`,
        ];
        const { rowCount } = await client.query(
          `UPDATE products SET seller_id=$1, showroom_id=$3, description=$5, price=$6, currency='ETB',
             stock=12, images=$7, category=$8, tags=$9, status='active', updated_at=NOW()
           WHERE business_id=$2 AND title=$4`,
          values,
        );
        if (!rowCount) {
          await client.query(
            `INSERT INTO products
               (seller_id, business_id, showroom_id, title, description, price, currency, stock, images, category, tags, status)
             VALUES ($1,$2,$3,$4,$5,$6,'ETB',12,$7,$8,$9,'active')`,
            values,
          );
        }
      }
    }
    await client.query('COMMIT');
    const productCount = fixtures.reduce((count, fixture) => count + (fixture.products?.length ?? 0), 0);
    console.log(`Demo seed completed (${fixtures.length} sample accounts, businesses, published showrooms, ${productCount} catalog products, and ${fixtures.length * 3} feed posts).`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error(`Demo seed failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(async (error) => {
  console.error(`Demo seed failed: ${error.message}`);
  process.exitCode = 1;
  await pool.end();
});
