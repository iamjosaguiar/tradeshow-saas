import { neon } from "@neondatabase/serverless"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const sql = neon(process.env.DATABASE_URL)

async function checkTradeshows() {
  console.log("📋 Checking tradeshows with creator information...\n")

  const tradeshows = await sql`
    SELECT
      t.id,
      t.name,
      t.slug,
      t.location,
      t.default_country,
      t.is_active,
      t.created_at,
      u.name as created_by_name,
      u.email as created_by_email,
      u.role as created_by_role
    FROM tradeshows t
    LEFT JOIN users u ON t.created_by = u.id
    ORDER BY t.created_at DESC
  `

  console.log(`Found ${tradeshows.length} tradeshows:\n`)
  console.log("=".repeat(100))

  tradeshows.forEach((ts, index) => {
    console.log(`\n${index + 1}. ${ts.name}`)
    console.log(`   Slug: ${ts.slug}`)
    console.log(`   Location: ${ts.location || "N/A"}`)
    console.log(`   Default Country: ${ts.default_country || "N/A"}`)
    console.log(`   Status: ${ts.is_active ? "Active" : "Inactive"}`)
    console.log(`   Created: ${new Date(ts.created_at).toLocaleString()}`)
    console.log(`   Created By: ${ts.created_by_name || "Unknown"} (${ts.created_by_email || "N/A"})`)
    console.log(`   Creator Role: ${ts.created_by_role || "N/A"}`)
  })

  console.log("\n" + "=".repeat(100))
}

checkTradeshows().catch(console.error)
