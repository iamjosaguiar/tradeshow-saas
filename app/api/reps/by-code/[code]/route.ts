import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const code = params.code

    const users = await sql`
      SELECT id, name, rep_code, email, role
      FROM users
      WHERE rep_code = ${code} AND role IN ('rep', 'admin')
      LIMIT 1
    `

    if (users.length === 0) {
      return NextResponse.json({ error: "Representative not found" }, { status: 404 })
    }

    return NextResponse.json(users[0])
  } catch (error) {
    console.error("Error fetching rep:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
