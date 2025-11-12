const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function getDynamicsUsers() {
  const D365_TENANT_ID = process.env.DYNAMICS_TENANT_ID;
  const D365_CLIENT_ID = process.env.DYNAMICS_CLIENT_ID;
  const D365_CLIENT_SECRET = process.env.DYNAMICS_CLIENT_SECRET;
  const D365_INSTANCE_URL = process.env.DYNAMICS_INSTANCE_URL;

  if (!D365_TENANT_ID || !D365_CLIENT_ID || !D365_CLIENT_SECRET || !D365_INSTANCE_URL) {
    console.log('Missing Dynamics credentials');
    process.exit(1);
  }

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
  const usersResponse = await fetch(
    `${D365_INSTANCE_URL}/api/data/v9.2/systemusers?$select=systemuserid,fullname,internalemailaddress&$filter=isdisabled eq false&$orderby=fullname asc`,
    {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/json',
      },
    }
  );

  const usersData = await usersResponse.json();
  console.log('\nDynamics 365 Users:\n');
  usersData.value.forEach((user, i) => {
    console.log(`${i + 1}. ${user.fullname}`);
    console.log(`   Email: ${user.internalemailaddress || 'N/A'}`);
    console.log(`   ID: ${user.systemuserid}\n`);
  });
}

getDynamicsUsers();
