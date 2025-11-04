const bcrypt = require('bcryptjs');
const { neon } = require('@neondatabase/serverless');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production') });

async function createRep() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  // Rep details
  const rep = {
    email: 'jb.bourdeau@cleanspacetechnology.com',
    name: 'Jean-Baptiste Bourdeau',
    rep_code: 'jean-baptiste-bourdeau',
    password: 'CleanSpace2024!' // Temporary password - rep should change on first login
  };

  console.log('🔐 Creating sales rep account...\n');
  console.log(`Name: ${rep.name}`);
  console.log(`Email: ${rep.email}`);
  console.log(`Rep Code: ${rep.rep_code}`);
  console.log(`Temporary Password: ${rep.password}\n`);

  try {
    // Check if user already exists
    const existingUser = await sql`
      SELECT email FROM users WHERE email = ${rep.email}
    `;

    if (existingUser.length > 0) {
      console.log(`⚠️  User ${rep.email} already exists. Skipping...`);
      return;
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(rep.password, 10);

    // Insert the new rep
    const result = await sql`
      INSERT INTO users (email, name, password_hash, role, rep_code)
      VALUES (${rep.email}, ${rep.name}, ${passwordHash}, 'rep', ${rep.rep_code})
      RETURNING id, email, name, rep_code
    `;

    console.log('✅ Successfully created rep account!');
    console.log('\n📋 Account Details:');
    console.log(`   ID: ${result[0].id}`);
    console.log(`   Name: ${result[0].name}`);
    console.log(`   Email: ${result[0].email}`);
    console.log(`   Rep Code: ${result[0].rep_code}`);
    console.log(`   Password: ${rep.password}`);
    console.log('\n🔗 Form URL:');
    console.log(`   https://cleanspace-tradeshow-forms.vercel.app/trade-show-lead/[slug]/${rep.rep_code}`);
    console.log('\n📧 Send these credentials to the rep and ask them to change the password after first login.');

  } catch (error) {
    console.error('❌ Error creating rep:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createRep().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
