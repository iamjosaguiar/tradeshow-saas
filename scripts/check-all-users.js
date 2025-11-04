const { neon } = require('@neondatabase/serverless');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production') });

async function checkAllUsers() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  console.log('👥 Checking all users in database...\n');

  const users = await sql`
    SELECT id, name, email, role, rep_code
    FROM users
    ORDER BY role, name
  `;

  console.log(`Total users: ${users.length}\n`);

  const admins = users.filter(u => u.role === 'admin');
  const reps = users.filter(u => u.role === 'rep');

  console.log('─'.repeat(80));
  console.log(`\n👨‍💼 ADMINS (${admins.length}):\n`);
  admins.forEach((u, i) => {
    console.log(`${i + 1}. ${u.name} (${u.email})`);
  });

  console.log('\n─'.repeat(80));
  console.log(`\n👔 SALES REPS (${reps.length}):\n`);
  reps.forEach((u, i) => {
    console.log(`${i + 1}. ${u.name} (${u.email})`);
    console.log(`   Rep Code: ${u.rep_code}\n`);
  });

  console.log('─'.repeat(80));
}

checkAllUsers().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
