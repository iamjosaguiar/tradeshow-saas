import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { syncContactToActiveCampaign, createDynamics365Lead } from "@/lib/crm"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const email = formData.get("email") as string
    const name = formData.get("name") as string
    const phone = formData.get("phone") as string
    const country = formData.get("country") as string
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
    if (!email || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Initialize SQL connection
    const sql = neon(process.env.DATABASE_URL!)

    // Look up tradeshow with tenant information
    let tradeshowId: number | null = null
    let tenantId: number | null = null
    let activeCampaignTagId: string | null = null
    let isSelfManagedEvent = false

    if (tradeshowSlug) {
      const tradeshows = await sql`
        SELECT
          t.id,
          t.tenant_id,
          tt.tag_value as activecampaign_tag_id,
          u.role as created_by_role
        FROM tradeshows t
        LEFT JOIN tradeshow_tags tt ON t.id = tt.tradeshow_id AND tt.tag_name = 'activecampaign_tag_id'
        LEFT JOIN users u ON t.created_by = u.id
        WHERE t.slug = ${tradeshowSlug}
        LIMIT 1
      `

      if (tradeshows.length > 0) {
        tradeshowId = tradeshows[0].id
        tenantId = tradeshows[0].tenant_id
        activeCampaignTagId = tradeshows[0].activecampaign_tag_id
        isSelfManagedEvent = tradeshows[0].created_by_role === 'rep'
      }
    }

    if (!tenantId) {
      return NextResponse.json({
        error: "Invalid tradeshow or tenant not found"
      }, { status: 400 })
    }

    // Look up rep user ID, name, and Dynamics user ID from rep code
    let repUserId: number | null = null
    let repName: string | null = null
    let dynamicsUserId: string | null = null

    if (repCode) {
      const reps = await sql`
        SELECT id, name, dynamics_user_id, role
        FROM users
        WHERE rep_code = ${repCode}
          AND role IN ('rep', 'admin')
          AND tenant_id = ${tenantId}
        LIMIT 1
      `

      if (reps.length > 0) {
        repUserId = reps[0].id
        repName = reps[0].name
        dynamicsUserId = reps[0].dynamics_user_id
      }
    }

    // Convert file to binary for storage (only if badge photo exists)
    let photoUrl = null
    if (badgePhoto && badgePhoto.size > 0) {
      const bytes = await badgePhoto.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // Save badge photo with tenant_id
      const photoResult = await sql`
        INSERT INTO badge_photos (
          contact_email,
          contact_name,
          filename,
          mime_type,
          file_size,
          image_data,
          form_source,
          tradeshow_id,
          submitted_by_rep,
          tenant_id
        )
        VALUES (
          ${email},
          ${name},
          ${badgePhoto.name},
          ${badgePhoto.type},
          ${badgePhoto.size},
          ${buffer},
          'trade-show-lead',
          ${tradeshowId},
          ${repUserId},
          ${tenantId}
        )
        RETURNING id
      `

      const photoId = photoResult[0].id
      photoUrl = `${request.nextUrl.origin}/api/badge-photo/${photoId}`
    }

    // ActiveCampaign sync using tenant-specific credentials (skip for self managed events)
    let contactId = null
    if (!isSelfManagedEvent) {
      const acResult = await syncContactToActiveCampaign(
        tenantId,
        {
          email,
          firstName: name.split(" ")[0] || name,
          lastName: name.split(" ").slice(1).join(" ") || "",
          phone,
          fieldValues: [
            { field: "country", value: country || "" },
            { field: "job_title", value: role || "" },
            { field: "company", value: company || "" },
            { field: "comments", value: comments || "" },
            { field: "current_respirator", value: currentRespirator || "" },
            { field: "work_environment", value: workEnvironment || "" },
            { field: "number_of_staff", value: numberOfStaff || "" },
            { field: "sales_manager", value: repName || "" },
          ],
        },
        activeCampaignTagId ? [activeCampaignTagId] : []
      )

      if (acResult.success) {
        contactId = acResult.contactId
        console.log(`[TradeShowLead] Created AC contact: ${contactId}`)
      } else {
        console.warn(`[TradeShowLead] AC sync failed: ${acResult.error}`)
        // Continue even if AC fails - don't block form submission
      }
    }

    // Create Lead in Dynamics 365 using tenant-specific credentials
    const d365Result = await createDynamics365Lead(
      tenantId,
      {
        subject: `Tradeshow Lead: ${name}${tradeshowSlug ? ` - ${tradeshowSlug}` : ""}`,
        firstname: name.split(" ")[0] || name,
        lastname: name.split(" ").slice(1).join(" ") || name,
        emailaddress1: email,
        companyname: company || "",
        jobtitle: role || "",
        description: `${photoUrl ? `Badge Photo: ${photoUrl}\n\n` : ""}Current Respirator: ${currentRespirator || "Not specified"}\nWork Environment: ${workEnvironment || "Not specified"}\nCountry: ${country || "Not specified"}\nComments: ${comments || "None"}${tradeshowSlug ? `\nTradeshow: ${tradeshowSlug}` : ""}${repName ? `\nRep: ${repName}` : ""}`,
        telephone1: phone || "",
        address1_country: country || "",
      },
      dynamicsUserId || undefined
    )

    if (d365Result.success) {
      console.log(`[TradeShowLead] Created D365 lead: ${d365Result.leadId}`)
    } else {
      console.warn(`[TradeShowLead] D365 sync failed: ${d365Result.error}`)
      // Continue even if D365 fails - don't block form submission
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
