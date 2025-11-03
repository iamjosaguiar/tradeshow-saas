import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import bcrypt from "bcryptjs"

// GET - List all sales reps
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    const reps = await sql`
      SELECT id, email, name, rep_code, dynamics_user_id, created_at, last_login
      FROM users
      WHERE role = 'rep'
      ORDER BY name ASC
    `

    return NextResponse.json(reps)
  } catch (error) {
    console.error("Error fetching reps:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Create new sales rep
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { email, name, rep_code, dynamics_user_id, password } = body

    // Validate required fields
    if (!email || !name || !rep_code || !password) {
      return NextResponse.json(
        { error: "Missing required fields: email, name, rep_code, password" },
        { status: 400 }
      )
    }

    const sql = neon(process.env.DATABASE_URL!)

    // Check if email or rep_code already exists
    const existing = await sql`
      SELECT id FROM users
      WHERE email = ${email} OR rep_code = ${rep_code}
    `

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Email or rep code already exists" },
        { status: 409 }
      )
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10)

    // Create new rep
    const result = await sql`
      INSERT INTO users (email, name, rep_code, dynamics_user_id, password_hash, role)
      VALUES (${email}, ${name}, ${rep_code}, ${dynamics_user_id || null}, ${password_hash}, 'rep')
      RETURNING id, email, name, rep_code, dynamics_user_id, created_at
    `

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error creating rep:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Update sales rep
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { id, email, name, rep_code, dynamics_user_id, password } = body

    // Validate required fields
    if (!id || !email || !name || !rep_code) {
      return NextResponse.json(
        { error: "Missing required fields: id, email, name, rep_code" },
        { status: 400 }
      )
    }

    const sql = neon(process.env.DATABASE_URL!)

    // Check if email or rep_code is taken by another user
    const existing = await sql`
      SELECT id FROM users
      WHERE (email = ${email} OR rep_code = ${rep_code})
      AND id != ${id}
    `

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Email or rep code already exists" },
        { status: 409 }
      )
    }

    // If password is provided, hash it and update
    if (password) {
      const password_hash = await bcrypt.hash(password, 10)

      const result = await sql`
        UPDATE users
        SET email = ${email},
            name = ${name},
            rep_code = ${rep_code},
            dynamics_user_id = ${dynamics_user_id || null},
            password_hash = ${password_hash},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id} AND role = 'rep'
        RETURNING id, email, name, rep_code, dynamics_user_id, created_at, updated_at
      `

      if (result.length === 0) {
        return NextResponse.json({ error: "Rep not found" }, { status: 404 })
      }

      return NextResponse.json(result[0])
    } else {
      // Update without changing password
      const result = await sql`
        UPDATE users
        SET email = ${email},
            name = ${name},
            rep_code = ${rep_code},
            dynamics_user_id = ${dynamics_user_id || null},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id} AND role = 'rep'
        RETURNING id, email, name, rep_code, dynamics_user_id, created_at, updated_at
      `

      if (result.length === 0) {
        return NextResponse.json({ error: "Rep not found" }, { status: 404 })
      }

      return NextResponse.json(result[0])
    }
  } catch (error) {
    console.error("Error updating rep:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Delete sales rep
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Missing rep ID" }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    // Check if rep has any submissions
    const submissions = await sql`
      SELECT COUNT(*) as count
      FROM badge_photos
      WHERE submitted_by_rep = ${id}
    `

    const submissionCount = parseInt(submissions[0].count)

    if (submissionCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete rep with ${submissionCount} submissions. Consider deactivating instead.` },
        { status: 400 }
      )
    }

    const result = await sql`
      DELETE FROM users
      WHERE id = ${id} AND role = 'rep'
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Rep not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Rep deleted successfully" })
  } catch (error) {
    console.error("Error deleting rep:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
