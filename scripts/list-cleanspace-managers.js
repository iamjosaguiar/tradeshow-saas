const path = require('path');
const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

function generateRepCode(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

async function listCleanSpaceManagers() {
  console.log('🔍 Finding CleanSpace Technology Sales Managers...\n');

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

  // Filter for CleanSpace email addresses only
  const cleanspaceUsers = dynamicsUsers.filter(user =>
    user.internalemailaddress &&
    user.internalemailaddress.toLowerCase().includes('cleanspacetechnology.com') &&
    !user.fullname.startsWith('#')
  );

  console.log(`✅ Found ${cleanspaceUsers.length} CleanSpace users\n`);

  // Fetch all users from database
  console.log('📥 Fetching all users from database...');
  const sql = neon(process.env.DATABASE_URL);
  const dbUsers = await sql`
    SELECT id, email, name, rep_code, dynamics_user_id, role, created_at, last_login
    FROM users
    WHERE role IN ('rep', 'admin')
    ORDER BY name ASC
  `;

  // Create a map of database users by Dynamics ID
  const dbUserMap = new Map();
  dbUsers.forEach(user => {
    if (user.dynamics_user_id) {
      dbUserMap.set(user.dynamics_user_id, user);
    }
  });

  // Find missing CleanSpace users
  const missingUsers = [];
  cleanspaceUsers.forEach(dynUser => {
    if (!dbUserMap.has(dynUser.systemuserid)) {
      const repCode = generateRepCode(dynUser.fullname);
      missingUsers.push({
        id: dynUser.systemuserid,
        name: dynUser.fullname,
        email: dynUser.internalemailaddress,
        repCode: repCode
      });
    }
  });

  // Display results
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('         CLEANSPACE SALES MANAGERS TO BE CREATED              ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (missingUsers.length > 0) {
    console.log(`Found ${missingUsers.length} CleanSpace sales managers to create:\n`);
    missingUsers.forEach((user, i) => {
      console.log(`${i + 1}. ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Rep Code: ${user.repCode}`);
      console.log(`   Dynamics ID: ${user.id}\n`);
    });

    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('💡 These users will be created with:');
    console.log('   - role="rep"');
    console.log('   - password="CleanSpace2025!" (temporary)');
    console.log('   - Generated rep code based on their name\n');
  } else {
    console.log('✅ All CleanSpace sales managers are already in the database!\n');
  }

  return missingUsers;
}

listCleanSpaceManagers().catch(console.error);
