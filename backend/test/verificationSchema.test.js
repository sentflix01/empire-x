/**
 * Schema-drift guard: every column routes/verification.ts writes into
 * verification_requests MUST exist across migrations 13+35.
 * (This exact bug caused runtime 500s before the fix.)
 */
const fs=require('fs'),path=require('path');
test('verification route columns exist in schema migrations',()=>{
  const mig=fs.readFileSync(path.join(__dirname,'../db/migrate13.js'),'utf8')
            +fs.readFileSync(path.join(__dirname,'../db/migrate35.js'),'utf8');
  const cols=new Set();
  for(const m of mig.matchAll(/^\s*(?:ADD COLUMN IF NOT EXISTS\s+)?([a-z_]+)\s+(TEXT|TIMESTAMPTZ|UUID|INT|INTEGER|BOOLEAN)/gmi))cols.add(m[1].toLowerCase());
  ['status','user_id','id','created_at','updated_at'].forEach(c=>cols.add(c));
  const route=fs.readFileSync(path.join(__dirname,'../routes/verification.ts'),'utf8');
  const used=new Set();
  for(const m of route.matchAll(/INSERT INTO verification_requests \(([^)]+)\)/g))
    m[1].split(',').forEach(x=>{const t=x.trim().toLowerCase();if(/^[a-z_]+$/.test(t))used.add(t);});
  for(const m of route.matchAll(/UPDATE\s+verification_requests\s+SET([^)]+?)WHERE/gis))
    m[1].split(',').forEach(pair=>{const t=pair.split('=')[0].trim().toLowerCase();if(/^[a-z_]+$/.test(t))used.add(t);});
  const missing=[...used].filter(c=>!cols.has(c));
  expect(missing).toEqual([]);
});
