const bcrypt = require('bcryptjs');
const { neon } = require('@neondatabase/serverless');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production') });

async function updateAdminPasswords() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  // Admin emails to update
  const adminEmails = [
    'gabrielle.ocarroll@cleanspacetechnology.com',
    'judith.waugh@cleanspacetechnology.com'
  ];

  const newPassword = 'CleanSpace2025!';

  console.log('🔐 Updating admin passwords...\n');
  console.log(`New password: ${newPassword}`);
  console.log(`Admins to update: ${adminEmails.length}\n`);
  console.log('─'.repeat(80));

  // Hash the new password
  const passwordHash = await bcrypt.hash(newPassword, 10);

  let updated = 0;
  let notFound = 0;

  for (const email of adminEmails) {
    try {
      // Update the password
      const result = await sql`
        UPDATE users
        SET password_hash = ${passwordHash},
            updated_at = CURRENT_TIMESTAMP
        WHERE email = ${email} AND role = 'admin'
        RETURNING name, email, role
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
  console.log(`   Total: ${adminEmails.length}\n`);

  console.log('📋 Updated Admin Credentials:\n');
  console.log('Login URL: https://tradeshow.cleanspacetechnology.com/login');
  console.log(`New Password: ${newPassword}\n`);

  console.log('Gabrielle O\'Carroll: gabrielle.ocarroll@cleanspacetechnology.com');
  console.log('Judith Waugh: judith.waugh@cleanspacetechnology.com\n');

  console.log('📧 Send the updated password to both admins via secure communication.');
}

updateAdminPasswords().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
