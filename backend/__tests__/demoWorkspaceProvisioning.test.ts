import fs from 'node:fs';
import path from 'node:path';
import { discoverMigrationFiles } from '../db/migrate-all';

describe('Demo workspace provisioning', () => {
  const migration = fs.readFileSync(path.join(__dirname, '../db/migrate49.js'), 'utf8');
  const seed = fs.readFileSync(path.join(__dirname, '../db/seed-demo.js'), 'utf8');
  const productRoute = fs.readFileSync(path.join(__dirname, '../routes/products.ts'), 'utf8');
  const fixtures = require('../db/demo-fixtures.cjs') as Array<{
    name: string;
    business: string;
    category: string;
    avatar: string;
    cover: string;
    logo: string;
    products?: Array<{ title: string }>;
    services?: Array<{ name: string }>;
    posts: string[];
  }>;

  it('adds the showroom-to-business link before the Demo seed needs it', () => {
    const migrations = discoverMigrationFiles();

    expect(migrations.indexOf('migrate49.js')).toBeGreaterThan(-1);
    expect(seed).toContain('showrooms (owner_id, business_id, title');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS business_id UUID');
    expect(migration).toContain('REFERENCES businesses(id) ON DELETE CASCADE');
  });

  it('gives sample Demo showcases non-billable public visibility', () => {
    expect(seed).toContain("VALUES ($1, 'premium', 'active', NOW(), NOW() + INTERVAL '365 days')");
    expect(seed).toContain('WHERE business_subscriptions.stripe_subscription_id IS NULL');
    expect(seed).toContain('INSERT INTO showrooms');
  });

  it('provides complete personal and business identities with business-specific offerings', () => {
    expect(fixtures).toHaveLength(11);
    for (const fixture of fixtures) {
      const offeringCount = (fixture.products?.length ?? 0) + (fixture.services?.length ?? 0);
      expect(offeringCount).toBeGreaterThanOrEqual(5);
      expect(offeringCount).toBeLessThanOrEqual(10);
      expect(fixture.avatar).toMatch(/^https:\/\//);
      expect(fixture.cover).toMatch(/^https:\/\//);
      expect(fixture.logo).toMatch(/^https:\/\//);
      expect(fixture.posts).toHaveLength(2);
    }

    expect(fixtures.map(fixture => fixture.category)).toEqual(expect.arrayContaining([
      'Pharmacy',
      'Supermarket',
      'Transportation',
      'Telecommunications',
      'Hospitality',
      'Public Services',
    ]));
    expect(seed).toContain("profile_type='personal'");
    expect(seed).toContain('has_business_profile=TRUE');
    expect(seed).toContain('avatar_url=$4');
    expect(seed).toContain('business_logo_url=$13');
    expect(seed).toContain('posts (author_id, author_name, content, image_url, post_type)');
  });

  it('supports bounded, parameterized product catalog search and category filtering', () => {
    expect(productRoute).toContain('search must be at most 100 characters');
    expect(productRoute).toContain('LOWER(p.category)=LOWER($');
    expect(productRoute).toContain('p.title ILIKE ${searchParam}');
    expect(productRoute).toContain('values.push(searchPattern)');
  });
});
