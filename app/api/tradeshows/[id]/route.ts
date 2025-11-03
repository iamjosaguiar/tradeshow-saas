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

    return NextResponse.json({
      ...tradeshow[0],
      tags,
      submissions,
    })
  } catch (error) {
    console.error("Error fetching tradeshow:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
