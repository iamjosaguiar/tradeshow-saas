require('dotenv').config({ path: '.env.local' });

async function checkLeadCountryField() {
  try {
    const D365_TENANT_ID = process.env.DYNAMICS_TENANT_ID;
    const D365_CLIENT_ID = process.env.DYNAMICS_CLIENT_ID;
    const D365_CLIENT_SECRET = process.env.DYNAMICS_CLIENT_SECRET;
    const D365_INSTANCE_URL = process.env.DYNAMICS_INSTANCE_URL;

    // Get OAuth token
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${D365_TENANT_ID}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: D365_CLIENT_ID,
          client_secret: D365_CLIENT_SECRET,
          scope: `${D365_INSTANCE_URL}/.default`,
          grant_type: "client_credentials",
        }),
      }
    );

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    console.log("🔍 Checking Lead entity's address1_country field...\n");

    // Get the field metadata
    const fieldResponse = await fetch(
      `${D365_INSTANCE_URL}/api/data/v9.2/EntityDefinitions(LogicalName='lead')/Attributes(LogicalName='address1_country')`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "OData-MaxVersion": "4.0",
          "OData-Version": "4.0",
        },
      }
    );

    if (!fieldResponse.ok) {
      console.error("❌ Failed to fetch field metadata:", await fieldResponse.text());
      return;
    }

    const fieldData = await fieldResponse.json();
    console.log("📋 Field Type:", fieldData["@odata.type"]);
    console.log("📋 Field Name:", fieldData.LogicalName);
    console.log("📋 Max Length:", fieldData.MaxLength || "N/A");

    // Check if there's a picklist version
    console.log("\n🔍 Looking for picklist country fields in Lead entity...\n");

    const allFieldsResponse = await fetch(
      `${D365_INSTANCE_URL}/api/data/v9.2/EntityDefinitions(LogicalName='lead')/Attributes?$filter=contains(LogicalName,'country')`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "OData-MaxVersion": "4.0",
          "OData-Version": "4.0",
        },
      }
    );

    const allFieldsData = await allFieldsResponse.json();
    console.log("📋 All country-related fields in Lead:");
    allFieldsData.value.forEach(field => {
      console.log(`  - ${field.LogicalName} (${field["@odata.type"]})`);
    });

  } catch (error) {
    console.error("Error:", error.message);
  }
}

checkLeadCountryField();
