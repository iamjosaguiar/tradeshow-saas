const { neon } = require('@neondatabase/serverless');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production') });

async function prepareTestRep() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  console.log('🔍 Setting up test environment...\n');

  // Check available tradeshows
  console.log('1. Available Tradeshows:');
  console.log('─'.repeat(80));
  const tradeshows = await sql`
    SELECT id, name, slug, is_active
    FROM tradeshows
    WHERE is_active = true
    ORDER BY name
  `;

  tradeshows.forEach((ts, i) => {
    console.log(`   ${i + 1}. ${ts.name}`);
    console.log(`      Slug: ${ts.slug}`);
    console.log(`      ID: ${ts.id}\n`);
  });

  // Check reps
  console.log('─'.repeat(80));
  console.log('2. Available Reps:');
  console.log('─'.repeat(80));
  const reps = await sql`
    SELECT id, name, email, rep_code, dynamics_user_id
    FROM users
    WHERE role = 'rep'
    ORDER BY name
    LIMIT 3
  `;

  reps.forEach((rep, i) => {
    console.log(`   ${i + 1}. ${rep.name} (${rep.rep_code})`);
    console.log(`      Email: ${rep.email}`);
    console.log(`      Dynamics User: ${rep.dynamics_user_id || 'Not assigned'}\n`);
  });

  // Get first few Dynamics users
  console.log('─'.repeat(80));
  console.log('3. Fetching Dynamics 365 users...');
  console.log('─'.repeat(80));

  const D365_TENANT_ID = process.env.DYNAMICS_TENANT_ID;
  const D365_CLIENT_ID = process.env.DYNAMICS_CLIENT_ID;
  const D365_CLIENT_SECRET = process.env.DYNAMICS_CLIENT_SECRET;
  const D365_INSTANCE_URL = process.env.DYNAMICS_INSTANCE_URL;

  try {
    // Get OAuth token
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

    const tokenData = await tokenResponse.json();

    // Fetch users - filter for real users (not system accounts)
    const usersResponse = await fetch(
      `${D365_INSTANCE_URL}/api/data/v9.2/systemusers?$select=systemuserid,fullname,internalemailaddress&$filter=isdisabled eq false and accessmode eq 0&$orderby=fullname asc&$top=5`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
        },
      }
    );

    const usersData = await usersResponse.json();

    console.log('   Available Dynamics Users (showing first 5 real users):\n');
    usersData.value.forEach((user, i) => {
      console.log(`   ${i + 1}. ${user.fullname}`);
      console.log(`      Email: ${user.internalemailaddress || 'N/A'}`);
      console.log(`      ID: ${user.systemuserid}\n`);
    });

    console.log('─'.repeat(80));
    console.log('\n📋 Test Plan:');
    console.log('\n1. I can assign a Dynamics user to one of the reps above');
    console.log('2. Then we\'ll submit a test lead through the form');
    console.log('3. We\'ll verify it appears in:');
    console.log('   - Database (badge_photos table)');
    console.log('   - ActiveCampaign');
    console.log('   - Dynamics 365 (assigned to the correct user)');
    console.log('\nWhich rep would you like to test with?');

  } catch (error) {
    console.error('❌ Error fetching Dynamics users:', error.message);
  }
}

prepareTestRep().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
