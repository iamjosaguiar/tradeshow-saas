require('dotenv').config({ path: '.env.local' });

async function exploreDynamicsCountries() {
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

    console.log("🔍 Searching for country-related entities...\n");

    // Search for entities with "country" in the name
    const entitiesResponse = await fetch(
      `${D365_INSTANCE_URL}/api/data/v9.2/EntityDefinitions?$select=LogicalName,DisplayName&$filter=contains(LogicalName,'country') or contains(LogicalName,'region')`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "OData-MaxVersion": "4.0",
          "OData-Version": "4.0",
        },
      }
    );

    const entitiesData = await entitiesResponse.json();

    if (entitiesData.value && entitiesData.value.length > 0) {
      console.log("📋 Found country/region entities:");
      entitiesData.value.forEach(entity => {
        const displayName = entity.DisplayName && entity.DisplayName.UserLocalizedLabel
          ? entity.DisplayName.UserLocalizedLabel.Label
          : 'N/A';
        console.log(`  - ${entity.LogicalName} (${displayName})`);
      });
    } else {
      console.log("❌ No country/region entities found");
    }

    console.log("\n🔍 Checking for global option sets with 'country'...\n");

    // Check for global option sets
    const globalOptionsResponse = await fetch(
      `${D365_INSTANCE_URL}/api/data/v9.2/GlobalOptionSetDefinitions?$select=Name,DisplayName`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "OData-MaxVersion": "4.0",
          "OData-Version": "4.0",
        },
      }
    );

    const globalOptionsData = await globalOptionsResponse.json();
    const countryOptions = globalOptionsData.value.filter(opt =>
      opt.Name && (opt.Name.toLowerCase().includes('country') || opt.Name.toLowerCase().includes('region'))
    );

    if (countryOptions.length > 0) {
      console.log("📋 Found global option sets:");
      countryOptions.forEach(opt => {
        const displayName = opt.DisplayName && opt.DisplayName.UserLocalizedLabel
          ? opt.DisplayName.UserLocalizedLabel.Label
          : 'N/A';
        console.log(`  - ${opt.Name} (${displayName})`);
      });
    } else {
      console.log("❌ No country/region global option sets found");
    }

    console.log("\n🔍 Checking all entities for sample...\n");

    // Get a few entities to see what's available
    const allEntitiesResponse = await fetch(
      `${D365_INSTANCE_URL}/api/data/v9.2/EntityDefinitions?$select=LogicalName,DisplayName&$top=20`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "OData-MaxVersion": "4.0",
          "OData-Version": "4.0",
        },
      }
    );

    const allEntitiesData = await allEntitiesResponse.json();
    console.log("📋 Sample of available entities:");
    allEntitiesData.value.slice(0, 10).forEach(entity => {
      const displayName = entity.DisplayName && entity.DisplayName.UserLocalizedLabel
        ? entity.DisplayName.UserLocalizedLabel.Label
        : 'N/A';
      console.log(`  - ${entity.LogicalName} (${displayName})`);
    });

  } catch (error) {
    console.error("Error:", error.message);
    if (error.response) {
      console.error("Response:", await error.response.text());
    }
  }
}

exploreDynamicsCountries();
