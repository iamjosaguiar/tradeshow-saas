const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function testAndUploadDynamics() {
  console.log('🔍 Testing Dynamics 365 API with local credentials...\n');

  const D365_TENANT_ID = process.env.DYNAMICS_TENANT_ID;
  const D365_CLIENT_ID = process.env.DYNAMICS_CLIENT_ID;
  const D365_CLIENT_SECRET = process.env.DYNAMICS_CLIENT_SECRET;
  const D365_INSTANCE_URL = process.env.DYNAMICS_INSTANCE_URL;

  console.log('Credentials found:');
  console.log(`   TENANT_ID: ${D365_TENANT_ID}`);
  console.log(`   CLIENT_ID: ${D365_CLIENT_ID}`);
  console.log(`   INSTANCE_URL: ${D365_INSTANCE_URL}\n`);

  try {
    console.log('1. Getting OAuth token...');
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
      console.error('❌ Token request failed:', await tokenResponse.text());
      process.exit(1);
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ OAuth token obtained\n');

    console.log('2. Fetching system users...');
    const usersResponse = await fetch(
      `${D365_INSTANCE_URL}/api/data/v9.2/systemusers?$select=systemuserid,fullname,internalemailaddress&$filter=isdisabled eq false&$orderby=fullname asc&$top=10`,
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
      console.error('❌ Users request failed:', await usersResponse.text());
      process.exit(1);
    }

    const usersData = await usersResponse.json();
    console.log(`✅ Found ${usersData.value.length} users (showing first 10)\n`);

    usersData.value.forEach((user, i) => {
      console.log(`${i + 1}. ${user.fullname} (${user.internalemailaddress || 'No email'})`);
      console.log(`   ID: ${user.systemuserid}\n`);
    });

    console.log('✨ Dynamics 365 connection successful!');
    console.log('\n📝 Next: Adding these credentials to Vercel...');
    console.log('\nRun these commands in your terminal:\n');
    console.log(`echo '${D365_TENANT_ID}' | vercel env add DYNAMICS_TENANT_ID production`);
    console.log(`echo '${D365_CLIENT_ID}' | vercel env add DYNAMICS_CLIENT_ID production`);
    console.log(`echo '${D365_CLIENT_SECRET}' | vercel env add DYNAMICS_CLIENT_SECRET production`);
    console.log(`echo '${D365_INSTANCE_URL}' | vercel env add DYNAMICS_INSTANCE_URL production\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testAndUploadDynamics();
