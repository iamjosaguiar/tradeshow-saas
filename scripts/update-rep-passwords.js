const bcrypt = require('bcryptjs');
const { neon } = require('@neondatabase/serverless');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production') });

async function updateRepPasswords() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  // List of rep emails to update
  const repEmails = [
    'jb.bourdeau@cleanspacetechnology.com',
    'greg.sesny@cleanspacetechnology.com',
    'laurent.coupe@cleanspacetechnology.com',
    'craig.brown@cleanspacetechnology.com',
    'krister.lennes@cleanspacetechnology.com',
    'patrick.poetsch@cleanspacetechnology.com',
    'fabienne.selles@cleanspacetechnology.com'
  ];

  const newPassword = 'CleanSpace2025!';

  console.log('🔐 Updating sales rep passwords...\n');
  console.log(`New password for all reps: ${newPassword}`);
  console.log(`Total reps to update: ${repEmails.length}\n`);
  console.log('─'.repeat(80));

  // Hash the new password
  const passwordHash = await bcrypt.hash(newPassword, 10);

  let updated = 0;
  let notFound = 0;

  for (const email of repEmails) {
    try {
      // Update the password
      const result = await sql`
        UPDATE users
        SET password_hash = ${passwordHash},
            updated_at = CURRENT_TIMESTAMP
        WHERE email = ${email} AND role = 'rep'
        RETURNING name, email, rep_code
      `;

      if (result.length > 0) {
        console.log(`✅ ${result[0].name} (${result[0].email}) - Password updated`);
        updated++;
      } else {
        console.log(`⚠️  ${email} - User not found`);
        notFound++;
      }

    } catch (error) {
      console.error(`❌ Error updating ${email}:`, error.message);
    }
  }

  console.log('─'.repeat(80));
  console.log('\n📊 Summary:');
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ⚠️  Not Found: ${notFound}`);
  console.log(`   Total: ${repEmails.length}\n`);

  console.log('📋 New Credentials:\n');
  console.log('Login URL: https://tradeshow.cleanspacetechnology.com/login');
  console.log(`New Password (all reps): ${newPassword}\n`);

  console.log('📧 Send the updated password to all reps via secure communication.');
}

updateRepPasswords().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
