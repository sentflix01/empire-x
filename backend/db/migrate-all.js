/**
 * Run all database migrations in order.
 * Usage: node db/migrate-all.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { spawnSync } = require('child_process');
const path = require('path');

const migrations = ['migrate.js', 'migrate2.js', 'migrate3.js', 'migrate4.js', 'migrate5.js', 'migrate6.js', 'migrate7.js', 'migrate8.js', 'migrate9.js', 'migrate10.js', 'migrate11.js', 'migrate12.js', 'migrate13.js', 'migrate14.js', 'migrate15.js', 'migrate16.js'];

console.log('\n🗄️  Running all Empire X migrations...\n');

for (const file of migrations) {
  const full = path.join(__dirname, file);
  console.log(`── ${file}`);
  const result = spawnSync(process.execPath, [full], { stdio: 'inherit', env: process.env });
  if (result.status !== 0) {
    console.error(`\n❌ ${file} failed`);
    process.exit(1);
  }
}

console.log('\n✅ All migrations complete.\n');
