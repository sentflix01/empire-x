require('dotenv').config();
const pool=require('./db/pool.ts');
(async()=>{
  const cols=await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='conversations' ORDER BY ordinal_position`);
  console.log('conversations columns:', cols.rows.map(r=>r.column_name).join(', '));
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const {rows:[conv]}=await client.query(`INSERT INTO conversations (type,last_message,participant_ids,participant_names) VALUES ('dm','',$1::text,$2::text) RETURNING *`,[JSON.stringify(['a','b']),JSON.stringify(['User','User'])]);
    console.log('INSERT OK',conv.id);
    await client.query('ROLLBACK');
  }catch(e){ await client.query('ROLLBACK').catch(()=>{}); console.log('INSERT FAIL:',e.message); }
  client.release();process.exit(0);
})();
