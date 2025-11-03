import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const email = formData.get("email") as string
    const name = formData.get("name") as string
    const region = formData.get("region") as string
    const comments = formData.get("comments") as string
    const company = formData.get("company") as string
    const role = formData.get("role") as string
    const currentRespirator = formData.get("currentRespirator") as string
    const workEnvironment = formData.get("workEnvironment") as string
    const numberOfStaff = formData.get("numberOfStaff") as string
    const badgePhoto = formData.get("badgePhoto") as File
    const tradeshowSlug = formData.get("tradeshowSlug") as string
    const repCode = formData.get("repCode") as string | null

    // Validate required fields
    if (!email || !name || !badgePhoto) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Initialize SQL connection
    const sql = neon(process.env.DATABASE_URL!)

    // Look up tradeshow ID from slug
    let tradeshowId: number | null = null
    let activeCampaignTagId: string | null = null

    if (tradeshowSlug) {
      const tradeshows = await sql`
        SELECT t.id, tt.tag_value as activecampaign_tag_id
        FROM tradeshows t
        LEFT JOIN tradeshow_tags tt ON t.id = tt.tradeshow_id AND tt.tag_name = 'activecampaign_tag_id'
        WHERE t.slug = ${tradeshowSlug}
        LIMIT 1
      `

      if (tradeshows.length > 0) {
        tradeshowId = tradeshows[0].id
        activeCampaignTagId = tradeshows[0].activecampaign_tag_id
      }
    }

    // Look up rep user ID, name, and Dynamics user ID from rep code
    let repUserId: number | null = null
    let repName: string | null = null
    let dynamicsUserId: string | null = null

    if (repCode) {
      const reps = await sql`
        SELECT id, name, dynamics_user_id
        FROM users
        WHERE rep_code = ${repCode} AND role = 'rep'
        LIMIT 1
      `

      if (reps.length > 0) {
        repUserId = reps[0].id
        repName = reps[0].name
        dynamicsUserId = reps[0].dynamics_user_id
      }
    }

    // Get ActiveCampaign credentials from environment variables
    const AC_API_URL = process.env.ACTIVECAMPAIGN_API_URL
    const AC_API_KEY = process.env.ACTIVECAMPAIGN_API_KEY

    if (!AC_API_URL || !AC_API_KEY) {
      console.error("ActiveCampaign credentials not configured")
      // Return success even if AC is not configured to prevent form errors during setup
      return NextResponse.json({
        success: true,
        message: "Form submitted (ActiveCampaign not configured)",
      })
    }

    // Convert file to binary for storage
    const bytes = await badgePhoto.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Save badge photo to Neon DB as binary (bytea) with tradeshow_id and submitted_by_rep
    const photoResult = await sql`
      INSERT INTO badge_photos (contact_email, contact_name, filename, mime_type, file_size, image_data, form_source, tradeshow_id, submitted_by_rep)
      VALUES (${email}, ${name}, ${badgePhoto.name}, ${badgePhoto.type}, ${badgePhoto.size}, ${buffer}, 'trade-show-lead', ${tradeshowId}, ${repUserId})
      RETURNING id
    `

    const photoId = photoResult[0].id
    const photoUrl = `${request.nextUrl.origin}/api/badge-photo/${photoId}`

    // Create or update contact in ActiveCampaign
    const contactData = {
      contact: {
        email: email,
        firstName: name.split(" ")[0] || name,
        lastName: name.split(" ").slice(1).join(" ") || "",
        phone: "",
        fieldValues: [
          {
            field: "1", // Country (using for Region)
            value: region || "",
          },
          {
            field: "4", // Job Title (using for Role)
            value: role || "",
          },
          {
            field: "8", // Company
            value: company || "",
          },
          {
            field: "9", // Comments
            value: comments || "",
          },
          {
            field: "11", // Current Respirator
            value: currentRespirator || "",
          },
          {
            field: "12", // Work Environment
            value: workEnvironment || "",
          },
          {
            field: "13", // Number of Staff
            value: numberOfStaff || "",
          },
          {
            field: "14", // Sales Rep
            value: repName || "",
          },
        ],
      },
    }

    // Add contact to ActiveCampaign
    const acResponse = await fetch(`${AC_API_URL}/api/3/contacts`, {
      method: "POST",
      headers: {
        "Api-Token": AC_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(contactData),
    })

    if (!acResponse.ok) {
      const errorText = await acResponse.text()
      console.error("ActiveCampaign API error:", errorText)

      // Still return success to user, but log the error
      return NextResponse.json({
        success: true,
        message: "Form submitted (ActiveCampaign sync pending)",
      })
    }

    const acResult = await acResponse.json()
    const contactId = acResult.contact?.id

    // Add note to contact with badge photo URL only
    // All other form data is now stored in custom fields
    if (contactId) {
      const repInfo = repName ? `\nCaptured by Rep: ${repName} (${repCode})` : ""
      const tradeshowInfo = tradeshowSlug ? `\nTradeshow: ${tradeshowSlug}` : ""

      const noteData = {
        note: {
          note: `Trade Show Lead Submission\n\nBadge Photo: ${badgePhoto.name} (${(badgePhoto.size / 1024).toFixed(2)} KB)\nBadge Photo URL: ${photoUrl}${tradeshowInfo}${repInfo}`,
          relid: contactId,
          reltype: "Subscriber",
        },
      }

      await fetch(`${AC_API_URL}/api/3/notes`, {
        method: "POST",
        headers: {
          "Api-Token": AC_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(noteData),
      })
    }

    // Tag the contact with the tradeshow's ActiveCampaign tag (if configured)
    if (contactId && activeCampaignTagId) {
      const tagData = {
        contactTag: {
          contact: contactId,
          tag: activeCampaignTagId,
        },
      }

      await fetch(`${AC_API_URL}/api/3/contactTags`, {
        method: "POST",
        headers: {
          "Api-Token": AC_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tagData),
      })
    }

    // Create Lead in Dynamics 365
    const D365_TENANT_ID = process.env.DYNAMICS_TENANT_ID
    const D365_CLIENT_ID = process.env.DYNAMICS_CLIENT_ID
    const D365_CLIENT_SECRET = process.env.DYNAMICS_CLIENT_SECRET
    const D365_INSTANCE_URL = process.env.DYNAMICS_INSTANCE_URL

    if (D365_TENANT_ID && D365_CLIENT_ID && D365_CLIENT_SECRET && D365_INSTANCE_URL) {
      try {
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
          console.error("Failed to get D365 token:", await tokenResponse.text())
        } else {
          const tokenData = await tokenResponse.json()
          const accessToken = tokenData.access_token

          // Prepare lead data for Dynamics 365
          const tradeshowInfo = tradeshowSlug ? ` - ${tradeshowSlug}` : ""
          const repInfo = repName ? ` (Rep: ${repName})` : ""

          // Convert numberOfStaff to integer if possible
          let employeeCount = null
          if (numberOfStaff) {
            const match = numberOfStaff.match(/\d+/)
            if (match) {
              employeeCount = parseInt(match[0])
            }
          }

          const leadData: any = {
            subject: `Tradeshow Lead: ${name}${tradeshowInfo}`,
            firstname: name.split(" ")[0] || name,
            lastname: name.split(" ").slice(1).join(" ") || name,
            emailaddress1: email,
            companyname: company || "",
            jobtitle: role || "",
            description: `Badge Photo: ${photoUrl}\n\nCurrent Respirator: ${currentRespirator || "Not specified"}\nWork Environment: ${workEnvironment || "Not specified"}\nRegion: ${region || "Not specified"}\nComments: ${comments || "None"}${tradeshowInfo}${repInfo}`,
            mobilephone: "",
            address1_country: region || "",
            numberofemployees: employeeCount,
          }

          // Assign lead to Dynamics user if configured for this rep
          if (dynamicsUserId) {
            leadData["ownerid@odata.bind"] = `/systemusers(${dynamicsUserId})`
          }

          // Create lead in Dynamics 365
          const leadResponse = await fetch(`${D365_INSTANCE_URL}/api/data/v9.2/leads`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
              Accept: "application/json",
              "OData-MaxVersion": "4.0",
              "OData-Version": "4.0",
            },
            body: JSON.stringify(leadData),
          })

          if (leadResponse.ok) {
            const leadId = leadResponse.headers.get("OData-EntityId")
            console.log(`Created Dynamics 365 lead: ${leadId}`)
          } else {
            console.error("Failed to create D365 lead:", await leadResponse.text())
          }
        }
      } catch (d365Error) {
        console.error("Error creating Dynamics 365 lead:", d365Error)
        // Continue even if D365 fails - form submission still succeeds
      }
    }

    return NextResponse.json({
      success: true,
      message: "Form submitted successfully",
      contactId: contactId,
    })
  } catch (error) {
    console.error("Form submission error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
