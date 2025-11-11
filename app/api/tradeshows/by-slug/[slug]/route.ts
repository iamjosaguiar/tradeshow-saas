import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const slug = params.slug

    const tradeshows = await sql`
      SELECT id, name, slug, description, location, start_date, end_date, default_country, is_active, created_at
      FROM tradeshows
      WHERE slug = ${slug}
      LIMIT 1
    `

    if (tradeshows.length === 0) {
      return NextResponse.json({ error: "Tradeshow not found" }, { status: 404 })
    }

    return NextResponse.json(tradeshows[0])
  } catch (error) {
    console.error("Error fetching tradeshow:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
