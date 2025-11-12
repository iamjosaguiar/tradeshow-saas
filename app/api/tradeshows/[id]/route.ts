import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { neon } from "@neondatabase/serverless"

export const dynamic = "force-dynamic"

// GET - Get single tradeshow with submissions
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = neon(process.env.DATABASE_URL!)
    const tradeshowId = parseInt(params.id)

    // Get tradeshow details
    const tradeshow = await sql`
      SELECT
        t.*,
        u.name as created_by_name,
        COUNT(bp.id) as submission_count
      FROM tradeshows t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN badge_photos bp ON t.id = bp.tradeshow_id
      WHERE t.id = ${tradeshowId}
      GROUP BY t.id, u.name
    `

    if (tradeshow.length === 0) {
      return NextResponse.json({ error: "Tradeshow not found" }, { status: 404 })
    }

    // Get tags
    const tags = await sql`
      SELECT tag_name, tag_value
      FROM tradeshow_tags
      WHERE tradeshow_id = ${tradeshowId}
    `

    // Get submissions
    const submissions = await sql`
      SELECT
        bp.id,
        bp.contact_email,
        bp.contact_name,
        bp.uploaded_at,
        u.name as rep_name,
        u.rep_code
      FROM badge_photos bp
      LEFT JOIN users u ON bp.submitted_by_rep = u.id
      WHERE bp.tradeshow_id = ${tradeshowId}
      ORDER BY bp.uploaded_at DESC
    `

    // Get assigned reps (with error handling for new table)
    let assignedReps = []
    try {
      assignedReps = await sql`
        SELECT u.id, u.name, u.email, u.rep_code
        FROM tradeshow_rep_assignments tra
        INNER JOIN users u ON tra.user_id = u.id
        WHERE tra.tradeshow_id = ${tradeshowId} AND u.role = 'rep'
        ORDER BY u.name
      `
    } catch (error) {
      console.log('tradeshow_rep_assignments table not found, no assignments loaded')
    }

    return NextResponse.json({
      ...tradeshow[0],
      tags,
      submissions,
      assignedReps,
    })
  } catch (error) {
    console.error("Error fetching tradeshow:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH - Update tradeshow
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = neon(process.env.DATABASE_URL!)
    const tradeshowId = parseInt(params.id)
    const body = await request.json()

    const { name, description, location, startDate, endDate, defaultCountry, isActive, activeCampaignTagName, assignedReps } = body

    // Update tradeshow
    await sql`
      UPDATE tradeshows
      SET
        name = ${name},
        description = ${description},
        location = ${location},
        start_date = ${startDate},
        end_date = ${endDate},
        default_country = ${defaultCountry},
        is_active = ${isActive},
        updated_at = NOW()
      WHERE id = ${tradeshowId}
    `

    // Create new ActiveCampaign tag if tag name provided
    if (activeCampaignTagName) {
      const AC_API_URL = process.env.ACTIVECAMPAIGN_API_URL
      const AC_API_KEY = process.env.ACTIVECAMPAIGN_API_KEY

      if (AC_API_URL && AC_API_KEY) {
        try {
          // Create tag in ActiveCampaign
          const tagResponse = await fetch(`${AC_API_URL}/api/3/tags`, {
            method: "POST",
            headers: {
              "Api-Token": AC_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              tag: {
                tag: activeCampaignTagName,
                tagType: "contact",
                description: `Lead capture tag for ${name} tradeshow${location ? ` in ${location}` : ""}`,
              },
            }),
          })

          if (tagResponse.ok) {
            const tagData = await tagResponse.json()
            const tagId = tagData.tag.id

            // Delete existing tag and insert new one
            await sql`
              DELETE FROM tradeshow_tags
              WHERE tradeshow_id = ${tradeshowId} AND tag_name = 'activecampaign_tag_id'
            `
            await sql`
              INSERT INTO tradeshow_tags (tradeshow_id, tag_name, tag_value)
              VALUES (${tradeshowId}, 'activecampaign_tag_id', ${tagId})
            `

            console.log(`Created ActiveCampaign tag "${activeCampaignTagName}" with ID ${tagId} for tradeshow ${tradeshowId}`)
          } else {
            console.error("Failed to create ActiveCampaign tag:", await tagResponse.text())
          }
        } catch (acError) {
          console.error("Error creating ActiveCampaign tag:", acError)
          // Continue even if AC tag creation fails
        }
      }
    }

    // Update rep assignments if provided
    if (assignedReps !== undefined) {
      try {
        // Delete existing assignments
        await sql`
          DELETE FROM tradeshow_rep_assignments
          WHERE tradeshow_id = ${tradeshowId}
        `

        // Insert new assignments
        if (assignedReps.length > 0) {
          for (const repId of assignedReps) {
            await sql`
              INSERT INTO tradeshow_rep_assignments (tradeshow_id, user_id)
              VALUES (${tradeshowId}, ${repId})
              ON CONFLICT (tradeshow_id, user_id) DO NOTHING
            `
          }
          console.log(`Updated rep assignments for tradeshow ${tradeshowId}: ${assignedReps.length} reps assigned`)
        } else {
          console.log(`Removed all rep assignments for tradeshow ${tradeshowId}`)
        }
      } catch (assignError) {
        console.error("Error updating rep assignments:", assignError)
        // Continue even if rep assignment update fails
      }
    }

    return NextResponse.json({ success: true, message: "Tradeshow updated successfully" })
  } catch (error) {
    console.error("Error updating tradeshow:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Delete tradeshow permanently
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = neon(process.env.DATABASE_URL!)
    const tradeshowId = parseInt(params.id)

    // Check if tradeshow exists
    const tradeshow = await sql`
      SELECT id, name FROM tradeshows WHERE id = ${tradeshowId}
    `

    if (tradeshow.length === 0) {
      return NextResponse.json({ error: "Tradeshow not found" }, { status: 404 })
    }

    // Delete associated data first (due to foreign key constraints)
    // Delete tradeshow tags
    await sql`
      DELETE FROM tradeshow_tags WHERE tradeshow_id = ${tradeshowId}
    `

    // Delete badge photos/submissions
    await sql`
      DELETE FROM badge_photos WHERE tradeshow_id = ${tradeshowId}
    `

    // Delete the tradeshow
    await sql`
      DELETE FROM tradeshows WHERE id = ${tradeshowId}
    `

    console.log(`Tradeshow "${tradeshow[0].name}" (ID: ${tradeshowId}) permanently deleted by ${session.user.email}`)

    return NextResponse.json({ success: true, message: "Tradeshow permanently deleted" })
  } catch (error) {
    console.error("Error deleting tradeshow:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
