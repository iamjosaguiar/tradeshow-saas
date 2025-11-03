import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const sql = neon(process.env.DATABASE_URL!)

    // Get count and latest submission for trade-show-lead form
    const tradeShowResults = await sql`
      SELECT
        COUNT(*) as count,
        MAX(uploaded_at) as latest_submission
      FROM badge_photos
      WHERE form_source = 'trade-show-lead'
    `

    // Get count and latest submission for aa-tradeshow-lead form
    const aaTradeShowResults = await sql`
      SELECT
        COUNT(*) as count,
        MAX(uploaded_at) as latest_submission
      FROM badge_photos
      WHERE form_source = 'aa-tradeshow-lead'
    `

    const canadianFrenchCount = parseInt(tradeShowResults[0].count as string) || 0
    const aaTradeShowCount = parseInt(aaTradeShowResults[0].count as string) || 0

    return NextResponse.json({
      canadianFrenchShow: {
        count: canadianFrenchCount,
        latestSubmission: tradeShowResults[0].latest_submission,
      },
      aaTradeshow: {
        count: aaTradeShowCount,
        latestSubmission: aaTradeShowResults[0].latest_submission,
      },
      totalSubmissions: canadianFrenchCount + aaTradeShowCount,
    })
  } catch (error) {
    console.error("Analytics fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}
