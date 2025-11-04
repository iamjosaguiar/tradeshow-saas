const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const testEmail = 'test-greg-sesny@example.com';
const expectedDynamicsUser = '112d80e1-77c2-ef11-a72e-00224810a62b';

console.log('🔍 Checking Dynamics 365 for test lead...\n');

(async () => {
  const D365_TENANT_ID = process.env.DYNAMICS_TENANT_ID;
  const D365_CLIENT_ID = process.env.DYNAMICS_CLIENT_ID;
  const D365_CLIENT_SECRET = process.env.DYNAMICS_CLIENT_SECRET;
  const D365_INSTANCE_URL = process.env.DYNAMICS_INSTANCE_URL;

  console.log('Credentials check:');
  console.log(`  TENANT_ID: ${D365_TENANT_ID ? '✅' : '❌'}`);
  console.log(`  CLIENT_ID: ${D365_CLIENT_ID ? '✅' : '❌'}`);
  console.log(`  CLIENT_SECRET: ${D365_CLIENT_SECRET ? '✅' : '❌'}`);
  console.log(`  INSTANCE_URL: ${D365_INSTANCE_URL ? '✅' : '❌'}\n`);

  if (!D365_TENANT_ID || !D365_CLIENT_ID || !D365_CLIENT_SECRET || !D365_INSTANCE_URL) {
    console.log('❌ Dynamics credentials missing');
    return;
  }

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

    if (!tokenResponse.ok) {
      console.log('❌ Failed to get Dynamics token');
      return;
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ OAuth token obtained\n');

    // Search for lead by email
    const leadsResponse = await fetch(
      `${D365_INSTANCE_URL}/api/data/v9.2/leads?$select=leadid,fullname,emailaddress1,companyname,subject,description,createdon,_ownerid_value&$filter=emailaddress1 eq '${testEmail}'&$orderby=createdon desc&$top=1`,
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
        },
      }
    );

    if (!leadsResponse.ok) {
      console.log(`❌ Dynamics API Error: ${leadsResponse.status}`);
      console.log(await leadsResponse.text());
      return;
    }

    const leadsData = await leadsResponse.json();

    if (leadsData.value && leadsData.value.length > 0) {
      const lead = leadsData.value[0];
      console.log('✅ FOUND IN DYNAMICS 365');
      console.log(`   Lead ID: ${lead.leadid}`);
      console.log(`   Name: ${lead.fullname}`);
      console.log(`   Email: ${lead.emailaddress1}`);
      console.log(`   Company: ${lead.companyname}`);
      console.log(`   Subject: ${lead.subject}`);
      console.log(`   Owner ID: ${lead._ownerid_value}`);
      console.log(`   Created: ${new Date(lead.createdon).toLocaleString()}\n`);

      // Check if owner matches Greg Sesny's Dynamics user
      if (lead._ownerid_value === expectedDynamicsUser) {
        console.log('   ✅ CORRECTLY ASSIGNED TO GREG SESNY\'S DYNAMICS USER!');
      } else {
        console.log(`   ⚠️  Owner mismatch!`);
        console.log(`   Expected: ${expectedDynamicsUser}`);
        console.log(`   Got: ${lead._ownerid_value}`);
      }
    } else {
      console.log('❌ NOT FOUND IN DYNAMICS 365');
      console.log('\nSearching for any recent leads...');

      // Try to find any recent leads
      const recentLeadsResponse = await fetch(
        `${D365_INSTANCE_URL}/api/data/v9.2/leads?$select=leadid,fullname,emailaddress1,createdon&$orderby=createdon desc&$top=5`,
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            Accept: 'application/json',
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0',
          },
        }
      );

      if (recentLeadsResponse.ok) {
        const recentData = await recentLeadsResponse.json();
        console.log(`\nFound ${recentData.value.length} recent leads:`);
        recentData.value.forEach((l, i) => {
          console.log(`  ${i+1}. ${l.fullname} (${l.emailaddress1}) - ${new Date(l.createdon).toLocaleString()}`);
        });
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
