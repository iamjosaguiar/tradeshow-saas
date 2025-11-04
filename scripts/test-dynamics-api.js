const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production') });

async function testDynamicsAPI() {
  console.log('🔍 Testing Dynamics 365 API connection...\n');

  const D365_TENANT_ID = process.env.DYNAMICS_TENANT_ID;
  const D365_CLIENT_ID = process.env.DYNAMICS_CLIENT_ID;
  const D365_CLIENT_SECRET = process.env.DYNAMICS_CLIENT_SECRET;
  const D365_INSTANCE_URL = process.env.DYNAMICS_INSTANCE_URL;

  console.log('Checking environment variables:');
  console.log(`   DYNAMICS_TENANT_ID: ${D365_TENANT_ID ? '✅ Set' : '❌ Missing'}`);
  console.log(`   DYNAMICS_CLIENT_ID: ${D365_CLIENT_ID ? '✅ Set' : '❌ Missing'}`);
  console.log(`   DYNAMICS_CLIENT_SECRET: ${D365_CLIENT_SECRET ? '✅ Set (hidden)' : '❌ Missing'}`);
  console.log(`   DYNAMICS_INSTANCE_URL: ${D365_INSTANCE_URL || '❌ Missing'}\n`);

  if (!D365_TENANT_ID || !D365_CLIENT_ID || !D365_CLIENT_SECRET || !D365_INSTANCE_URL) {
    console.error('❌ One or more Dynamics 365 credentials are missing');
    process.exit(1);
  }

  try {
    // Step 1: Get OAuth token
    console.log('1. Getting OAuth token from Azure AD...');
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${D365_TENANT_ID}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: D365_CLIENT_ID,
          client_secret: D365_CLIENT_SECRET,
          scope: `${D365_INSTANCE_URL}/.default`,
          grant_type: 'client_credentials',
        }),
      }
    );

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('❌ Failed to get OAuth token:');
      console.error(error);
      process.exit(1);
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ Successfully obtained OAuth token\n');

    // Step 2: Fetch system users
    console.log('2. Fetching system users from Dynamics 365...');
    const usersResponse = await fetch(
      `${D365_INSTANCE_URL}/api/data/v9.2/systemusers?$select=systemuserid,fullname,internalemailaddress&$filter=isdisabled eq false&$orderby=fullname asc`,
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

    if (!usersResponse.ok) {
      const error = await usersResponse.text();
      console.error('❌ Failed to fetch system users:');
      console.error(error);
      process.exit(1);
    }

    const usersData = await usersResponse.json();
    console.log(`✅ Successfully fetched ${usersData.value.length} active system users\n`);

    console.log('System Users:');
    usersData.value.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.fullname}`);
      console.log(`      Email: ${user.internalemailaddress || 'N/A'}`);
      console.log(`      ID: ${user.systemuserid}`);
      console.log('');
    });

    console.log('✨ Dynamics 365 API test successful!');
    console.log('\n📝 If the web UI still shows empty dropdown:');
    console.log('   1. Check browser console for JavaScript errors');
    console.log('   2. Check Network tab to see if /api/dynamics/users is being called');
    console.log('   3. Try opening /api/dynamics/users directly in browser (should require admin login)');

  } catch (error) {
    console.error('❌ Error testing Dynamics API:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testDynamicsAPI();
