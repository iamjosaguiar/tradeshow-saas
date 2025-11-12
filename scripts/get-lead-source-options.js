const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

/**
 * Script to fetch lead source option values from Dynamics 365
 */

async function getLeadSourceOptions() {
  console.log('🔍 Fetching lead source options from Dynamics 365...\n');

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

    // Fetch lead source metadata
    const metadataResponse = await fetch(
      `${D365_INSTANCE_URL}/api/data/v9.2/EntityDefinitions(LogicalName='lead')/Attributes(LogicalName='leadsourcecode')/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$select=LogicalName&$expand=OptionSet($select=Options),GlobalOptionSet($select=Options)`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    if (!metadataResponse.ok) {
      const error = await metadataResponse.text();
      console.error('❌ Failed to fetch metadata:', error);
      process.exit(1);
    }

    const metadataData = await metadataResponse.json();
    const options = metadataData.OptionSet?.Options || metadataData.GlobalOptionSet?.Options || [];

    console.log('✅ Lead Source Options:\n');
    console.log('Value | Label');
    console.log('------|------' + '-'.repeat(50));

    for (const option of options) {
      const label = option.Label?.UserLocalizedLabel?.Label || 'N/A';
      console.log(`${option.Value.toString().padStart(5)} | ${label}`);
    }

    console.log('\n✨ Done!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

getLeadSourceOptions();
