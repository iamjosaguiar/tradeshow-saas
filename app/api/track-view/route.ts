import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { formSource } = await request.json()

    if (!formSource) {
      return NextResponse.json({ error: "Missing form source" }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    // Create table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS page_views (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        form_source VARCHAR(50) NOT NULL,
        viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_agent TEXT,
        ip_address VARCHAR(45)
      )
    `

    // Insert page view
    await sql`
      INSERT INTO page_views (form_source, user_agent, ip_address)
      VALUES (
        ${formSource},
        ${request.headers.get("user-agent") || "unknown"},
        ${request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"}
      )
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Track view error:", error)
    return NextResponse.json({ error: "Failed to track view" }, { status: 500 })
  }
}
