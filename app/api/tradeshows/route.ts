import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { neon } from "@neondatabase/serverless"

export const dynamic = "force-dynamic"

// GET - List all tradeshows
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    // For reps, only show their own submission counts and filter by assignments
    // For admins, show total submission counts
    let tradeshows
    if (session.user.role === "rep") {
      // Check if ANY assignments exist in the system (with error handling for new table)
      let assignmentsExist = false
      let hasOwnAssignments = false

      try {
        // Check if the assignment system is being used at all
        const totalAssignments = await sql`
          SELECT COUNT(*) as count FROM tradeshow_rep_assignments
        `
        assignmentsExist = parseInt(totalAssignments[0].count) > 0

        // Check if this specific rep has assignments
        const myAssignments = await sql`
          SELECT COUNT(*) as count FROM tradeshow_rep_assignments
          WHERE user_id = ${session.user.id}
        `
        hasOwnAssignments = parseInt(myAssignments[0].count) > 0
      } catch (error) {
        console.log('tradeshow_rep_assignments table not found, showing all active tradeshows')
        assignmentsExist = false
      }

      if (assignmentsExist && hasOwnAssignments) {
        // Rep has assignments - show only assigned tradeshows
        tradeshows = await sql`
          SELECT
            t.id,
            t.name,
            t.slug,
            t.description,
            t.location,
            t.start_date,
            t.end_date,
            t.default_country,
            t.is_active,
            t.created_at,
            t.updated_at,
            u.name as created_by_name,
            COUNT(bp.id) FILTER (WHERE bp.submitted_by_rep = ${session.user.id}) as submission_count
          FROM tradeshows t
          LEFT JOIN users u ON t.created_by = u.id
          LEFT JOIN badge_photos bp ON t.id = bp.tradeshow_id
          INNER JOIN tradeshow_rep_assignments tra ON t.id = tra.tradeshow_id
          WHERE tra.user_id = ${session.user.id}
          GROUP BY t.id, u.name
          ORDER BY t.created_at DESC
        `
      } else if (assignmentsExist && !hasOwnAssignments) {
        // Assignment system is in use, but this rep has no assignments - show nothing
        tradeshows = []
      } else {
        // No assignments exist in the system - show all active tradeshows (backward compatibility)
        tradeshows = await sql`
          SELECT
            t.id,
            t.name,
            t.slug,
            t.description,
            t.location,
            t.start_date,
            t.end_date,
            t.default_country,
            t.is_active,
            t.created_at,
            t.updated_at,
            u.name as created_by_name,
            COUNT(bp.id) FILTER (WHERE bp.submitted_by_rep = ${session.user.id}) as submission_count
          FROM tradeshows t
          LEFT JOIN users u ON t.created_by = u.id
          LEFT JOIN badge_photos bp ON t.id = bp.tradeshow_id
          WHERE t.is_active = true
          GROUP BY t.id, u.name
          ORDER BY t.created_at DESC
        `
      }
    } else {
      // Get all tradeshows with total entry counts (admin view)
      tradeshows = await sql`
        SELECT
          t.id,
          t.name,
          t.slug,
          t.description,
          t.location,
          t.start_date,
          t.end_date,
          t.default_country,
          t.is_active,
          t.created_at,
          t.updated_at,
          u.name as created_by_name,
          u.role as created_by_role,
          COUNT(bp.id) as submission_count
        FROM tradeshows t
        LEFT JOIN users u ON t.created_by = u.id
        LEFT JOIN badge_photos bp ON t.id = bp.tradeshow_id
        GROUP BY t.id, u.name, u.role
        ORDER BY t.created_at DESC
      `
    }

    // Get tags for each tradeshow
    const tags = await sql`
      SELECT tradeshow_id, tag_name, tag_value
      FROM tradeshow_tags
    `

    // Get assigned reps for each tradeshow (with error handling for new table)
    let assignments = []
    try {
      assignments = await sql`
        SELECT tra.tradeshow_id, u.id, u.name, u.email
        FROM tradeshow_rep_assignments tra
        INNER JOIN users u ON tra.user_id = u.id
        WHERE u.role = 'rep'
        ORDER BY u.name
      `
    } catch (error) {
      console.log('tradeshow_rep_assignments table not found, no assignments loaded')
    }

    // Combine tradeshows with their tags and assigned reps
    const tradeshowsWithTags = tradeshows.map((tradeshow) => ({
      ...tradeshow,
      tags: tags.filter((tag) => tag.tradeshow_id === tradeshow.id),
      assignedReps: assignments.filter((assignment) => assignment.tradeshow_id === tradeshow.id),
    }))

    return NextResponse.json(tradeshowsWithTags)
  } catch (error) {
    console.error("Error fetching tradeshows:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Create new tradeshow (admin and reps)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || (session.user.role !== "admin" && session.user.role !== "rep")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, slug, description, location, startDate, endDate, defaultCountry, assignedReps = [] } = body

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug are required" }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    // Check if slug already exists
    const existing = await sql`
      SELECT id FROM tradeshows WHERE slug = ${slug}
    `

    if (existing.length > 0) {
      return NextResponse.json({ error: "Tradeshow with this slug already exists" }, { status: 400 })
    }

    // Create tradeshow
    const result = await sql`
      INSERT INTO tradeshows (name, slug, description, location, start_date, end_date, default_country, is_active, created_by)
      VALUES (
        ${name},
        ${slug},
        ${description || null},
        ${location || null},
        ${startDate || null},
        ${endDate || null},
        ${defaultCountry || null},
        true,
        ${session.user.id}
      )
      RETURNING id, name, slug, description, location, start_date, end_date, default_country, is_active, created_at
    `

    const tradeshowId = result[0].id

    // Automatically create ActiveCampaign tag
    const AC_API_URL = process.env.ACTIVECAMPAIGN_API_URL
    const AC_API_KEY = process.env.ACTIVECAMPAIGN_API_KEY

    if (AC_API_URL && AC_API_KEY) {
      try {
        // Generate tag name: "Tradeshow: {name} - {year}"
        const year = startDate ? new Date(startDate).getFullYear() : new Date().getFullYear()
        const tagName = `Tradeshow: ${name} - ${year}`

        // Create tag in ActiveCampaign
        const tagResponse = await fetch(`${AC_API_URL}/api/3/tags`, {
          method: "POST",
          headers: {
            "Api-Token": AC_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tag: {
              tag: tagName,
              tagType: "contact",
              description: `Lead capture tag for ${name} tradeshow${location ? ` in ${location}` : ""}`,
            },
          }),
        })

        if (tagResponse.ok) {
          const tagData = await tagResponse.json()
          const tagId = tagData.tag.id

          // Store tag ID in database
          await sql`
            INSERT INTO tradeshow_tags (tradeshow_id, tag_name, tag_value)
            VALUES (${tradeshowId}, 'activecampaign_tag_id', ${tagId})
          `

          console.log(`Created ActiveCampaign tag "${tagName}" with ID ${tagId} for tradeshow ${tradeshowId}`)
        } else {
          console.error("Failed to create ActiveCampaign tag:", await tagResponse.text())
        }
      } catch (acError) {
        console.error("Error creating ActiveCampaign tag:", acError)
        // Continue even if AC tag creation fails - tradeshow is still created
      }
    }

    // Assign reps to tradeshow if specified
    if (assignedReps.length > 0) {
      try {
        for (const repId of assignedReps) {
          await sql`
            INSERT INTO tradeshow_rep_assignments (tradeshow_id, user_id)
            VALUES (${tradeshowId}, ${repId})
            ON CONFLICT (tradeshow_id, user_id) DO NOTHING
          `
        }
        console.log(`Assigned ${assignedReps.length} reps to tradeshow ${tradeshowId}`)
      } catch (assignError) {
        console.error("Error assigning reps to tradeshow:", assignError)
        // Continue even if rep assignment fails - tradeshow is still created
      }
    }

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error creating tradeshow:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
