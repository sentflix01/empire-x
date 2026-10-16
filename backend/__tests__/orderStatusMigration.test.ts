import fs from 'node:fs';
import path from 'node:path';
import { discoverMigrationFiles } from '../db/migrate-all';

describe('order status migration', () => {
  it('discovers product inventory migration after order migrations', () => {
    const migrations = discoverMigrationFiles();
    expect(migrations.indexOf('migrate41.js')).toBeLessThan(migrations.indexOf('migrate42.js'));
    expect(migrations.indexOf('migrate42.js')).toBeLessThan(migrations.indexOf('migrate43.js'));
    expect(migrations.indexOf('migrate43.js')).toBeLessThan(migrations.indexOf('migrate44.js'));
    expect(migrations).toContain('migrate47.js');
    expect(migrations.indexOf('migrate43.js')).toBeLessThan(migrations.indexOf('migrate47.js'));
  });

  it('allows every fulfillment and return status used by the routes', () => {
    // migrate41 builds the constraint from the shared list (db/orderStatuses.js).
    const migration = fs.readFileSync(path.join(__dirname, '../db/migrate41.js'), 'utf8');
    expect(migration).toContain('orderStatusCheckSql()');
    const { ORDER_STATUSES } = require('../db/orderStatuses') as { ORDER_STATUSES: readonly string[] };
    for (const status of [
      'pending', 'paid', 'confirmed', 'processing', 'shipped', 'delivered', 'completed',
      'cancelled', 'disputed', 'payment_failed', 'refunded', 'return_requested', 'return_approved',
    ]) {
      expect(ORDER_STATUSES).toContain(status);
    }
  });

  it('adds every inventory field referenced by the bulk importer', () => {
    const migration = fs.readFileSync(path.join(__dirname, '../db/migrate43.js'), 'utf8');
    for (const column of [
      'sku', 'barcode', 'unit', 'cost_price', 'min_stock', 'max_stock', 'expiry_date',
      'batch_number', 'manufacturer', 'weight_kg', 'dimensions_cm', 'is_prescription',
      'controlled_substance', 'storage_condition', 'variant_of', 'is_bundle',
      'bundle_components', 'attributes', 'tax_rate',
    ]) expect(migration).toContain(`ADD COLUMN IF NOT EXISTS ${column}`);
    expect(migration).toContain("CHECK (status IN ('active','sold_out','draft','archived'))");
  });
});
