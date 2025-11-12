const path = require('path');
const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

function generateRepCode(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

async function createDynamicsManagers() {
  console.log('🔧 Creating Dynamics 365 Sales Managers in Database...\n');

  // Get Dynamics 365 credentials
  const D365_TENANT_ID = process.env.DYNAMICS_TENANT_ID;
  const D365_CLIENT_ID = process.env.DYNAMICS_CLIENT_ID;
  const D365_CLIENT_SECRET = process.env.DYNAMICS_CLIENT_SECRET;
  const D365_INSTANCE_URL = process.env.DYNAMICS_INSTANCE_URL;

  if (!D365_TENANT_ID || !D365_CLIENT_ID || !D365_CLIENT_SECRET || !D365_INSTANCE_URL) {
    console.log('❌ Missing Dynamics credentials');
    process.exit(1);
  }

  // Get OAuth token
  console.log('🔐 Authenticating with Dynamics 365...');
  const tokenResponse = await fetch(
    `https://login.microsoftonline.com/${D365_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: D365_CLIENT_ID,
        client_secret: D365_CLIENT_SECRET,
        scope: `${D365_INSTANCE_URL}/.default`,
        grant_type: 'client_credentials',
      }),
    }
  );

  if (!tokenResponse.ok) {
    console.log('❌ Failed to authenticate with Dynamics 365');
    process.exit(1);
  }

  const tokenData = await tokenResponse.json();

  // Fetch all active users from Dynamics
  console.log('📥 Fetching all active users from Dynamics 365...');
  const usersResponse = await fetch(
    `${D365_INSTANCE_URL}/api/data/v9.2/systemusers?$select=systemuserid,fullname,internalemailaddress&$filter=isdisabled eq false&$orderby=fullname asc`,
    {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json',
      },
    }
  );

  if (!usersResponse.ok) {
    console.log('❌ Failed to fetch users from Dynamics 365');
    process.exit(1);
  }

  const usersData = await usersResponse.json();
  const dynamicsUsers = usersData.value;

  // Filter for CleanSpace email addresses only, excluding system accounts
  const excludeEmails = [
    'generic.user@cleanspacetechnology.com',
    'itocadmin2@cleanspacetechnology.com'
  ];

  const cleanspaceUsers = dynamicsUsers.filter(user =>
    user.internalemailaddress &&
    user.internalemailaddress.toLowerCase().includes('cleanspacetechnology.com') &&
    !user.fullname.startsWith('#') &&
    !excludeEmails.includes(user.internalemailaddress.toLowerCase())
  );

  console.log(`✅ Found ${cleanspaceUsers.length} CleanSpace users to process\n`);

  // Connect to database
  const sql = neon(process.env.DATABASE_URL);

  // Fetch existing users
  console.log('📥 Fetching existing users from database...');
  const dbUsers = await sql`
    SELECT id, email, name, rep_code, dynamics_user_id, role
    FROM users
    WHERE role IN ('rep', 'admin')
  `;

  // Create maps for lookup
  const dbUsersByDynamicsId = new Map();
  const dbUsersByEmail = new Map();
  const dbUsersByRepCode = new Map();

  dbUsers.forEach(user => {
    if (user.dynamics_user_id) {
      dbUsersByDynamicsId.set(user.dynamics_user_id, user);
    }
    if (user.email) {
      dbUsersByEmail.set(user.email.toLowerCase(), user);
    }
    if (user.rep_code) {
      dbUsersByRepCode.set(user.rep_code.toLowerCase(), user);
    }
  });

  // Hash the default password
  const defaultPassword = 'CleanSpace2025!';
  console.log('🔐 Hashing default password...');
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // Process each user
  const toCreate = [];
  const alreadyExists = [];
  const conflicts = [];

  for (const dynUser of cleanspaceUsers) {
    // Check if already exists by Dynamics ID
    if (dbUsersByDynamicsId.has(dynUser.systemuserid)) {
      alreadyExists.push(dynUser.fullname);
      continue;
    }

    // Check if email already exists
    if (dbUsersByEmail.has(dynUser.internalemailaddress.toLowerCase())) {
      conflicts.push({
        name: dynUser.fullname,
        email: dynUser.internalemailaddress,
        reason: 'Email already exists in database'
      });
      continue;
    }

    // Generate rep code and check for conflicts
    let repCode = generateRepCode(dynUser.fullname);
    let originalRepCode = repCode;
    let counter = 2;

    while (dbUsersByRepCode.has(repCode.toLowerCase())) {
      repCode = `${originalRepCode}-${counter}`;
      counter++;
    }

    // Add to creation list
    toCreate.push({
      name: dynUser.fullname,
      email: dynUser.internalemailaddress,
      repCode: repCode,
      dynamicsId: dynUser.systemuserid
    });

    // Add to map to prevent duplicates in this batch
    dbUsersByRepCode.set(repCode.toLowerCase(), true);
  }

  // Display summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                         PROCESSING SUMMARY                     ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`✅ Already exists: ${alreadyExists.length}`);
  console.log(`⚠️  Conflicts: ${conflicts.length}`);
  console.log(`➕ To create: ${toCreate.length}\n`);

  if (conflicts.length > 0) {
    console.log('⚠️  CONFLICTS (will be skipped):\n');
    conflicts.forEach((conflict, i) => {
      console.log(`${i + 1}. ${conflict.name} (${conflict.email})`);
      console.log(`   Reason: ${conflict.reason}\n`);
    });
  }

  if (toCreate.length === 0) {
    console.log('✅ No new sales managers to create!\n');
    return;
  }

  console.log('➕ CREATING THE FOLLOWING SALES MANAGERS:\n');
  toCreate.forEach((user, i) => {
    console.log(`${i + 1}. ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Rep Code: ${user.repCode}`);
    console.log(`   Dynamics ID: ${user.dynamicsId}\n`);
  });

  // Create users
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                         CREATING USERS                         ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const created = [];
  const errors = [];

  for (const user of toCreate) {
    try {
      const result = await sql`
        INSERT INTO users (email, name, rep_code, dynamics_user_id, password_hash, role)
        VALUES (
          ${user.email},
          ${user.name},
          ${user.repCode},
          ${user.dynamicsId},
          ${passwordHash},
          'rep'
        )
        RETURNING id, email, name, rep_code
      `;

      created.push(user.name);
      console.log(`✅ Created: ${user.name} (${user.repCode})`);
    } catch (error) {
      errors.push({ name: user.name, error: error.message });
      console.log(`❌ Failed to create ${user.name}: ${error.message}`);
    }
  }

  // Final summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                         FINAL RESULTS                          ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`✅ Successfully created: ${created.length} sales managers`);
  if (errors.length > 0) {
    console.log(`❌ Failed: ${errors.length}`);
    console.log('\nErrors:');
    errors.forEach(err => {
      console.log(`  - ${err.name}: ${err.error}`);
    });
  }

  console.log('\n💡 Default password for all new users: CleanSpace2025!');
  console.log('   Users should change this on first login.\n');
}

createDynamicsManagers().catch(console.error);
