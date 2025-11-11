import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const email = formData.get("email") as string
    const name = formData.get("name") as string
    const country = formData.get("country") as string
    const comments = formData.get("comments") as string
    const company = formData.get("company") as string
    const role = formData.get("role") as string
    const currentRespirator = formData.get("currentRespirator") as string
    const workEnvironment = formData.get("workEnvironment") as string
    const numberOfStaff = formData.get("numberOfStaff") as string
    const repName = formData.get("repName") as string
    const badgePhoto = formData.get("badgePhoto") as File

    // Validate required fields
    if (!email || !name || !country) {
      return NextResponse.json({
        error: "Missing required fields",
        missing: {
          email: !email,
          name: !name,
          country: !country
        }
      }, { status: 400 })
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

    // Convert file to binary for storage (only if badge photo exists)
    const sql = neon(process.env.DATABASE_URL!)
    let photoUrl = null
    if (badgePhoto && badgePhoto.size > 0) {
      const bytes = await badgePhoto.arrayBuffer()
      const buffer = Buffer.from(bytes)

      // Save badge photo to Neon DB as binary (bytea)
      const photoResult = await sql`
        INSERT INTO badge_photos (contact_email, contact_name, filename, mime_type, file_size, image_data, form_source)
        VALUES (${email}, ${name}, ${badgePhoto.name}, ${badgePhoto.type}, ${badgePhoto.size}, ${buffer}, 'aa-tradeshow-lead')
        RETURNING id
      `

      const photoId = photoResult[0].id
      photoUrl = `${request.nextUrl.origin}/api/badge-photo/${photoId}`
    }

    // Create or update contact in ActiveCampaign
    const contactData = {
      contact: {
        email: email,
        firstName: name.split(" ")[0] || name,
        lastName: name.split(" ").slice(1).join(" ") || "",
        phone: "",
        fieldValues: [
          {
            field: "8", // Company (existing field)
            value: company || "",
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

    // Add note to contact with badge photo information
    if (contactId) {
      const photoInfo = photoUrl ? `Badge Photo: ${badgePhoto.name} (${(badgePhoto.size / 1024).toFixed(2)} KB)\n\nBadge Photo URL: ${photoUrl}\n\n` : ""
      const noteData = {
        note: {
          note: `A+A Tradeshow Lead - ${photoInfo}Form Details:\nCountry: ${country || "N/A"}\nCompany: ${company || "N/A"}\nRole: ${role || "N/A"}\nWork Environment: ${workEnvironment || "N/A"}\nNumber of Staff: ${numberOfStaff || "N/A"}\nCurrent Respirator: ${currentRespirator || "N/A"}${repName ? `\n\nCleanSpace Rep: ${repName}` : ""}${comments ? `\n\nDiscussion Comments:\n${comments}` : ""}`,
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

    // Tag the contact with "A+A Tradeshow"
    if (contactId) {
      const tagData = {
        contactTag: {
          contact: contactId,
          tag: "7", // A+A Tradeshow tag
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

    return NextResponse.json({
      success: true,
      message: "Form submitted successfully",
      contactId: contactId,
    })
  } catch (error) {
    console.error("Form submission error:", error)
    console.error("Error details:", error instanceof Error ? error.message : String(error))
    console.error("Stack trace:", error instanceof Error ? error.stack : "No stack trace")
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
