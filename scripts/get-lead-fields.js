const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

/**
 * Script to fetch a sample lead and display all available fields
 */

async function getLeadFields() {
  console.log('🔍 Fetching sample lead to identify field names...\\n');

  const D365_TENANT_ID = process.env.DYNAMICS_TENANT_ID;
  const D365_CLIENT_ID = process.env.DYNAMICS_CLIENT_ID;
  const D365_CLIENT_SECRET = process.env.DYNAMICS_CLIENT_SECRET;
  const D365_INSTANCE_URL = process.env.DYNAMICS_INSTANCE_URL;

  if (!D365_TENANT_ID || !D365_CLIENT_ID || !D365_CLIENT_SECRET || !D365_INSTANCE_URL) {
    console.error('❌ Missing Dynamics credentials');
    process.exit(1);
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

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    console.log('✅ Got OAuth token\\n');

    // Fetch one lead - use email from our A+A contacts
    const testEmail = 'josem.cacabelos@peycar.com';
    console.log(`🔎 Fetching lead: ${testEmail}\\n`);

    const leadResponse = await fetch(
      `${D365_INSTANCE_URL}/api/data/v9.2/leads?$filter=emailaddress1 eq '${testEmail}'&$top=1`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
        },
      }
    );

    if (!leadResponse.ok) {
      const error = await leadResponse.text();
      console.error('❌ Failed to fetch lead:', error);
      process.exit(1);
    }

    const leadData = await leadResponse.json();

    if (leadData.value.length === 0) {
      console.log('⚠️  Lead not found. Trying to get any lead...');

      const anyLeadResponse = await fetch(
        `${D365_INSTANCE_URL}/api/data/v9.2/leads?$top=1`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
            'OData-MaxVersion': '4.0',
            'OData-Version': '4.0',
          },
        }
      );

      const anyLeadData = await anyLeadResponse.json();
      if (anyLeadData.value.length === 0) {
        console.log('❌ No leads found in Dynamics');
        process.exit(1);
      }

      const lead = anyLeadData.value[0];
      console.log('✅ Found a lead\\n');
      console.log('📋 All available fields:\\n');
      console.log(JSON.stringify(lead, null, 2));
      return;
    }

    const lead = leadData.value[0];

    console.log('✅ Found lead\\n');
    console.log('='.repeat(80));
    console.log('📋 Lead Information:\\n');
    console.log(`Name: ${lead.fullname || 'N/A'}`);
    console.log(`Email: ${lead.emailaddress1 || 'N/A'}`);
    console.log(`\\n🏢 Company/Organization Fields:`);
    console.log(`   companyname: ${lead.companyname || 'N/A'}`);
    console.log(`\\n📍 Country/Address Fields:`);
    console.log(`   address1_country: ${lead.address1_country || 'N/A'}`);
    console.log(`   address1_city: ${lead.address1_city || 'N/A'}`);
    console.log(`   address1_stateorprovince: ${lead.address1_stateorprovince || 'N/A'}`);
    console.log(`   address1_postalcode: ${lead.address1_postalcode || 'N/A'}`);
    console.log('='.repeat(80));

    console.log('\\n📝 Full lead object (for reference):\\n');
    console.log(JSON.stringify(lead, null, 2));

    console.log('\\n✨ Done!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

getLeadFields();
