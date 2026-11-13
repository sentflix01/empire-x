/**
 * migrate90.js — rooms with an availability calendar.
 *
 * Decision 2026-11-12 "Room bookings: availability calendar and 48-hour hold":
 * a business lists room types, each with a number of identical rooms. A
 * booking is an order row with a room type, check-in/check-out dates and a
 * number of rooms; it holds those rooms for each night of the stay while it is
 * open. Owners can close nights (room_blocks).
 *
 * Idempotent: every step checks before it changes anything.
 */
module.exports = async function migrate90(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS room_types (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        name            TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
        description     TEXT CHECK (description IS NULL OR char_length(description) <= 1000),
        photo_url       TEXT CHECK (photo_url IS NULL OR char_length(photo_url) <= 2000),
        price_per_night NUMERIC(12,2) NOT NULL CHECK (price_per_night > 0),
        currency        TEXT NOT NULL DEFAULT 'ETB',
        max_guests      INT NOT NULL DEFAULT 2 CHECK (max_guests BETWEEN 1 AND 20),
        units           INT NOT NULL DEFAULT 1 CHECK (units BETWEEN 1 AND 500),
        active          BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order      INT NOT NULL DEFAULT 0,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
    await client.query('CREATE INDEX IF NOT EXISTS idx_room_types_business ON room_types (business_id, sort_order, created_at)');
    await client.query(`
      CREATE TABLE IF NOT EXISTS room_blocks (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
        night        DATE NOT NULL,
        units        INT NOT NULL DEFAULT 1 CHECK (units >= 1),
        note         TEXT CHECK (note IS NULL OR char_length(note) <= 200),
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (room_type_id, night)
      )`);

    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS room_type_id UUID REFERENCES room_types(id) ON DELETE SET NULL');
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS check_in DATE');
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS check_out DATE');
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS nights INT');
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS guests INT');
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS rooms INT');
    const { rows } = await client.query(
      "SELECT 1 FROM pg_constraint WHERE conrelid = 'orders'::regclass AND conname = 'orders_stay_check'",
    );
    if (!rows.length) {
      await client.query(`ALTER TABLE orders ADD CONSTRAINT orders_stay_check CHECK (
        check_in IS NULL OR (check_out > check_in AND nights >= 1 AND rooms >= 1 AND guests >= 1))`);
    }
    await client.query('CREATE INDEX IF NOT EXISTS idx_orders_room_stay ON orders (room_type_id, check_in, check_out) WHERE room_type_id IS NOT NULL');
    await client.query('COMMIT');
    console.log('✅ migrate90: room_types, room_blocks, orders stay columns');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
