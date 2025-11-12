const path = require('path');
const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function checkDynamicsManagers() {
  console.log('🔍 Checking Dynamics 365 Sales Managers vs Database...\n');

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

  console.log(`✅ Found ${dynamicsUsers.length} active users in Dynamics 365`);

  // Filter out service accounts (those starting with #)
  const realUsers = dynamicsUsers.filter(user => !user.fullname.startsWith('#'));
  console.log(`✅ Found ${realUsers.length} real users (${dynamicsUsers.length - realUsers.length} service accounts filtered out)\n`);

  // Fetch all users from database
  console.log('📥 Fetching all users from database...');
  const sql = neon(process.env.DATABASE_URL);
  const dbUsers = await sql`
    SELECT id, email, name, rep_code, dynamics_user_id, role, created_at, last_login
    FROM users
    WHERE role IN ('rep', 'admin')
    ORDER BY name ASC
  `;

  console.log(`✅ Found ${dbUsers.length} sales managers in database\n`);

  // Create a map of database users by Dynamics ID
  const dbUserMap = new Map();
  dbUsers.forEach(user => {
    if (user.dynamics_user_id) {
      dbUserMap.set(user.dynamics_user_id, user);
    }
  });

  // Find missing real users
  const missingUsers = [];
  realUsers.forEach(dynUser => {
    if (!dbUserMap.has(dynUser.systemuserid)) {
      missingUsers.push({
        id: dynUser.systemuserid,
        name: dynUser.fullname,
        email: dynUser.internalemailaddress || 'N/A'
      });
    }
  });

  // Display results
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                         COMPARISON RESULTS                     ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`📊 Total Real Users in Dynamics: ${realUsers.length}`);
  console.log(`📊 Total Database Users: ${dbUsers.length}`);
  console.log(`📊 Missing in Database: ${missingUsers.length}\n`);

  if (missingUsers.length > 0) {
    console.log('⚠️  MISSING SALES MANAGERS IN DATABASE:\n');
    console.log('The following sales managers exist in Dynamics 365 but NOT in the app:\n');
    missingUsers.forEach((user, i) => {
      console.log(`${i + 1}. ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Dynamics ID: ${user.id}\n`);
    });

    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('💡 These users will be created in the database with:');
    console.log('   - role="rep"');
    console.log('   - A temporary password that must be changed on first login');
    console.log('   - A generated rep code based on their name\n');
  } else {
    console.log('✅ All Dynamics 365 sales managers are already in the database!\n');
  }

  // Return the data for potential use
  return {
    realUsers: realUsers.map(u => ({
      id: u.systemuserid,
      name: u.fullname,
      email: u.internalemailaddress || 'N/A'
    })),
    dbUsers,
    missingUsers
  };
}

checkDynamicsManagers().catch(console.error);
