import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// GET - Fetch all active Dynamics 365 system users
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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

    // Fetch system users from Dynamics 365
    // Filter for active users and select only necessary fields
    const usersResponse = await fetch(
      `${D365_INSTANCE_URL}/api/data/v9.2/systemusers?$select=systemuserid,fullname,internalemailaddress&$filter=isdisabled eq false&$orderby=fullname asc`,
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

    if (!usersResponse.ok) {
      const error = await usersResponse.text()
      console.error("Failed to fetch D365 users:", error)
      return NextResponse.json(
        { error: "Failed to fetch Dynamics 365 users" },
        { status: 502 }
      )
    }

    const usersData = await usersResponse.json()

    // Transform the response to a simpler format
    const users = usersData.value.map((user: any) => ({
      id: user.systemuserid,
      name: user.fullname,
      email: user.internalemailaddress || "",
    }))

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error fetching Dynamics users:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
