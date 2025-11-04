const bcrypt = require('bcryptjs');
const { neon } = require('@neondatabase/serverless');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production') });

async function createMultipleReps() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  // List of reps to create
  const reps = [
    {
      name: 'Greg Sesny',
      email: 'greg.sesny@cleanspacetechnology.com',
      rep_code: 'greg-sesny'
    },
    {
      name: 'Laurent Coupe',
      email: 'laurent.coupe@cleanspacetechnology.com',
      rep_code: 'laurent-coupe'
    },
    {
      name: 'Craig Brown',
      email: 'craig.brown@cleanspacetechnology.com',
      rep_code: 'craig-brown'
    },
    {
      name: 'Krister Lennes',
      email: 'krister.lennes@cleanspacetechnology.com',
      rep_code: 'krister-lennes'
    },
    {
      name: 'Patrick Poetsch',
      email: 'patrick.poetsch@cleanspacetechnology.com', // normalized to lowercase
      rep_code: 'patrick-poetsch'
    },
    {
      name: 'Fabienne Selles',
      email: 'fabienne.selles@cleanspacetechnology.com',
      rep_code: 'fabienne-selles'
    }
  ];

  const password = 'CleanSpace2024!'; // Same temporary password for all
  const passwordHash = await bcrypt.hash(password, 10);

  console.log('🔐 Creating sales rep accounts...\n');
  console.log(`Total reps to create: ${reps.length}`);
  console.log(`Temporary password for all: ${password}\n`);
  console.log('─'.repeat(80));

  const created = [];
  const skipped = [];

  for (const rep of reps) {
    try {
      // Check if user already exists
      const existingUser = await sql`
        SELECT email FROM users WHERE email = ${rep.email}
      `;

      if (existingUser.length > 0) {
        console.log(`⚠️  ${rep.name} (${rep.email}) - Already exists, skipping...`);
        skipped.push(rep);
        continue;
      }

      // Insert the new rep
      const result = await sql`
        INSERT INTO users (email, name, password_hash, role, rep_code)
        VALUES (${rep.email}, ${rep.name}, ${passwordHash}, 'rep', ${rep.rep_code})
        RETURNING id, email, name, rep_code
      `;

      console.log(`✅ ${rep.name} - Created successfully`);
      console.log(`   Email: ${rep.email}`);
      console.log(`   Rep Code: ${rep.rep_code}`);
      console.log(`   ID: ${result[0].id}\n`);

      created.push(result[0]);

    } catch (error) {
      console.error(`❌ Error creating ${rep.name}:`, error.message);
    }
  }

  console.log('─'.repeat(80));
  console.log('\n📊 Summary:');
  console.log(`   ✅ Created: ${created.length}`);
  console.log(`   ⚠️  Skipped: ${skipped.length}`);
  console.log(`   Total: ${reps.length}\n`);

  if (created.length > 0) {
    console.log('📋 Credentials to send:\n');
    console.log('Login URL: https://cleanspace-tradeshow-forms.vercel.app/login');
    console.log(`Temporary Password (all): ${password}\n`);

    created.forEach(rep => {
      console.log(`${rep.name}:`);
      console.log(`  Email: ${rep.email}`);
      console.log(`  Rep Code: ${rep.rep_code}`);
      console.log(`  Form URL: /trade-show-lead/[slug]/${rep.rep_code}\n`);
    });

    console.log('📧 Important: Send credentials securely and ask reps to change password after first login.');
  }
}

createMultipleReps().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
