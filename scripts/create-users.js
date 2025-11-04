const bcrypt = require('bcryptjs');
const { neon } = require('@neondatabase/serverless');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function createUsers() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  // Define users to create
  const users = [
    {
      email: 'gabrielle.ocarroll@cleanspacetechnology.com',
      name: "Gabrielle O'Carroll",
      role: 'admin',
      password: 'CleanSpace2024!'
    },
    {
      email: 'judith.waugh@cleanspacetechnology.com',
      name: 'Judith Waugh',
      role: 'admin',
      password: 'CleanSpace2024!'
    }
  ];

  console.log('🔐 Hashing passwords and creating users...\n');

  for (const user of users) {
    try {
      // Hash the password
      const passwordHash = await bcrypt.hash(user.password, 10);

      // Check if user already exists
      const existingUser = await sql`
        SELECT email FROM users WHERE email = ${user.email}
      `;

      if (existingUser.length > 0) {
        console.log(`⚠️  User ${user.email} already exists. Skipping...`);
        continue;
      }

      // Insert the new user
      await sql`
        INSERT INTO users (email, name, password_hash, role, rep_code)
        VALUES (${user.email}, ${user.name}, ${passwordHash}, ${user.role}, NULL)
      `;

      console.log(`✅ Created user: ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Password: ${user.password}\n`);

    } catch (error) {
      console.error(`❌ Error creating user ${user.email}:`, error.message);
    }
  }

  console.log('✨ User creation complete!');
  console.log('\nUsers can now log in at: /login');
}

createUsers().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
