import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, currentPassword, newPassword } = body

    const sql = neon(process.env.DATABASE_URL!)

    // Get user's current data
    const users = await sql`
      SELECT id, name, email, password_hash
      FROM users
      WHERE email = ${session.user.email}
      LIMIT 1
    `

    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const user = users[0]

    // If changing password, verify current password first
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Current password is required to set a new password" },
          { status: 400 }
        )
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash)
      if (!isValidPassword) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
      }

      // Validate new password
      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: "New password must be at least 8 characters long" },
          { status: 400 }
        )
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10)

      // Update password and optionally name
      await sql`
        UPDATE users
        SET
          password_hash = ${hashedPassword},
          name = ${name || user.name},
          updated_at = NOW()
        WHERE id = ${user.id}
      `
    } else if (name && name !== user.name) {
      // Only update name if provided and different
      await sql`
        UPDATE users
        SET
          name = ${name},
          updated_at = NOW()
        WHERE id = ${user.id}
      `
    } else {
      return NextResponse.json({ error: "No changes to update" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
    })
  } catch (error) {
    console.error("Settings update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
