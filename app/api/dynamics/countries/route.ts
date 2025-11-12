import { NextResponse } from "next/server"

// GET - Fetch all countries from Dynamics 365 Lead entity address1_country picklist
export async function GET() {
  try {
    // Get Dynamics 365 credentials
    const D365_TENANT_ID = process.env.DYNAMICS_TENANT_ID
    const D365_CLIENT_ID = process.env.DYNAMICS_CLIENT_ID
    const D365_CLIENT_SECRET = process.env.DYNAMICS_CLIENT_SECRET
    const D365_INSTANCE_URL = process.env.DYNAMICS_INSTANCE_URL

    if (!D365_TENANT_ID || !D365_CLIENT_ID || !D365_CLIENT_SECRET || !D365_INSTANCE_URL) {
      return NextResponse.json(
        { error: "Dynamics 365 credentials not configured" },
        { status: 503 }
      )
    }

    // Get OAuth token from Azure AD
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${D365_TENANT_ID}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: D365_CLIENT_ID,
          client_secret: D365_CLIENT_SECRET,
          scope: `${D365_INSTANCE_URL}/.default`,
          grant_type: "client_credentials",
        }),
      }
    )

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      console.error("Failed to get D365 token:", error)
      return NextResponse.json(
        { error: "Failed to authenticate with Dynamics 365" },
        { status: 502 }
      )
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Fetch address1_country picklist metadata from Lead entity
    const metadataResponse = await fetch(
      `${D365_INSTANCE_URL}/api/data/v9.2/EntityDefinitions(LogicalName='lead')/Attributes(LogicalName='address1_country')/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$select=LogicalName&$expand=OptionSet($select=Options),GlobalOptionSet($select=Options)`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "OData-MaxVersion": "4.0",
          "OData-Version": "4.0",
        },
      }
    )

    if (!metadataResponse.ok) {
      const error = await metadataResponse.text()
      console.error("Failed to fetch D365 country metadata:", error)
      return NextResponse.json(
        { error: "Failed to fetch country options from Dynamics 365" },
        { status: 502 }
      )
    }

    const metadataData = await metadataResponse.json()

    // Extract options from either OptionSet or GlobalOptionSet
    const options = metadataData.OptionSet?.Options || metadataData.GlobalOptionSet?.Options || []

    // Transform options to simple array of country objects with label and value
    const countries = options
      .map((option: any) => ({
        label: option.Label?.UserLocalizedLabel?.Label || "",
        value: option.Value,
      }))
      .filter((country: any) => country.label) // Filter out any empty labels
      .sort((a: any, b: any) => a.label.localeCompare(b.label)) // Sort alphabetically

    return NextResponse.json(countries)
  } catch (error) {
    console.error("Error fetching Dynamics countries:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
