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

    // Fetch distinct country values from existing leads
    const leadsResponse = await fetch(
      `${D365_INSTANCE_URL}/api/data/v9.2/leads?$select=address1_country&$filter=address1_country ne null&$orderby=address1_country asc`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "OData-MaxVersion": "4.0",
          "OData-Version": "4.0",
          Prefer: "odata.maxpagesize=500",
        },
      }
    )

    if (!leadsResponse.ok) {
      const error = await leadsResponse.text()
      console.error("Failed to fetch D365 leads for countries:", error)
      return NextResponse.json(
        { error: "Failed to fetch country options from Dynamics 365" },
        { status: 502 }
      )
    }

    const leadsData = await leadsResponse.json()

    // Extract unique country values
    const uniqueCountries = new Set<string>()
    leadsData.value.forEach((lead: any) => {
      if (lead.address1_country && lead.address1_country.trim()) {
        uniqueCountries.add(lead.address1_country.trim())
      }
    })

    // Transform to array and sort
    const countries = Array.from(uniqueCountries)
      .map((country, index) => ({
        label: country,
        value: index,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))

    return NextResponse.json(countries)
  } catch (error) {
    console.error("Error fetching Dynamics countries:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
