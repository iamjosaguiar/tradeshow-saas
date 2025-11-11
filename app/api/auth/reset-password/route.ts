import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { hash } from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json({
        error: "Token and password are required"
      }, { status: 400 })
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json({
        error: "Password must be at least 8 characters long"
      }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    // Find user by reset token
    const users = await sql`
      SELECT id, email, name, password_reset_expires
      FROM users
      WHERE password_reset_token = ${token}
      LIMIT 1
    `

    if (users.length === 0) {
      return NextResponse.json({
        error: "Invalid or expired reset token"
      }, { status: 400 })
    }

    const user = users[0]

    // Check if token has expired
    const now = new Date()
    const expiresAt = new Date(user.password_reset_expires)

    if (now > expiresAt) {
      // Clear expired token
      await sql`
        UPDATE users
        SET password_reset_token = NULL,
            password_reset_expires = NULL
        WHERE id = ${user.id}
      `

      return NextResponse.json({
        error: "Reset token has expired. Please request a new one."
      }, { status: 400 })
    }

    // Hash the new password
    const passwordHash = await hash(password, 10)

    // Update password and clear reset token
    await sql`
      UPDATE users
      SET password_hash = ${passwordHash},
          password_reset_token = NULL,
          password_reset_expires = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${user.id}
    `

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully. You can now log in with your new password."
    })

  } catch (error) {
    console.error("Reset password error:", error)
    return NextResponse.json({
      error: "An error occurred. Please try again later."
    }, { status: 500 })
  }
}

// GET endpoint to verify if a token is valid
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')

    if (!token) {
      return NextResponse.json({
        error: "Token is required"
      }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    // Find user by reset token
    const users = await sql`
      SELECT password_reset_expires
      FROM users
      WHERE password_reset_token = ${token}
      LIMIT 1
    `

    if (users.length === 0) {
      return NextResponse.json({
        valid: false,
        error: "Invalid reset token"
      }, { status: 400 })
    }

    const user = users[0]

    // Check if token has expired
    const now = new Date()
    const expiresAt = new Date(user.password_reset_expires)

    if (now > expiresAt) {
      return NextResponse.json({
        valid: false,
        error: "Reset token has expired"
      }, { status: 400 })
    }

    return NextResponse.json({
      valid: true,
      message: "Token is valid"
    })

  } catch (error) {
    console.error("Verify token error:", error)
    return NextResponse.json({
      error: "An error occurred"
    }, { status: 500 })
  }
}
