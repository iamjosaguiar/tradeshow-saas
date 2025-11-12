import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { neon } from "@neondatabase/serverless"

export const dynamic = "force-dynamic"

// POST - Toggle tradeshow active status
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = neon(process.env.DATABASE_URL!)
    const tradeshowId = parseInt(params.id)

    // Get current status
    const tradeshow = await sql`
      SELECT id, name, is_active FROM tradeshows WHERE id = ${tradeshowId}
    `

    if (tradeshow.length === 0) {
      return NextResponse.json({ error: "Tradeshow not found" }, { status: 404 })
    }

    const currentStatus = tradeshow[0].is_active
    const newStatus = !currentStatus

    // Toggle the status
    await sql`
      UPDATE tradeshows
      SET is_active = ${newStatus}, updated_at = NOW()
      WHERE id = ${tradeshowId}
    `

    console.log(
      `Tradeshow "${tradeshow[0].name}" (ID: ${tradeshowId}) status changed from ${currentStatus ? "active" : "inactive"} to ${newStatus ? "active" : "inactive"} by ${session.user.email}`
    )

    return NextResponse.json({
      success: true,
      message: `Tradeshow ${newStatus ? "activated" : "archived"}`,
      is_active: newStatus,
    })
  } catch (error) {
    console.error("Error toggling tradeshow status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
