module.exports = async function migrate75(pool) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Drop old constraint if it exists (name may vary — use the catalog to find it)
    await client.query(`
      DO $$
      DECLARE v_constraint text;
      BEGIN
        SELECT conname INTO v_constraint
          FROM pg_constraint
         WHERE conrelid = 'showrooms'::regclass
           AND contype = 'c'
           AND pg_get_constraintdef(oid) LIKE '%spotlight_mode%';
        IF v_constraint IS NOT NULL THEN
          EXECUTE 'ALTER TABLE showrooms DROP CONSTRAINT ' || quote_ident(v_constraint);
        END IF;
      END$$;
    `);
    // Add new constraint allowing 'off' as well
    await client.query(`
      ALTER TABLE showrooms
        ADD CONSTRAINT showrooms_spotlight_mode_check
          CHECK (spotlight_mode IN ('single', 'carousel', 'off'))
    `);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
