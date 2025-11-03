import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    if (!id) {
      return NextResponse.json({ error: "Missing photo ID" }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    const result = await sql`
      SELECT filename, mime_type, image_data
      FROM badge_photos
      WHERE id = ${id}
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 })
    }

    const photo = result[0]

    // image_data is already binary (bytea), convert to Buffer
    const imageBuffer = Buffer.from(photo.image_data)

    // Return image with proper headers
    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": photo.mime_type,
        "Content-Disposition": `inline; filename="${photo.filename}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error) {
    console.error("Error retrieving badge photo:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
