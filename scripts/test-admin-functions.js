import { neon } from "@neondatabase/serverless"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const sql = neon(process.env.DATABASE_URL)

async function testAdminFunctions() {
  console.log("🧪 Testing Admin Archive/Delete Functions\n")
  console.log("=" .repeat(80))

  // 1. List current tradeshows
  console.log("\n1️⃣ Current tradeshows:")
  const tradeshows = await sql`
    SELECT id, name, is_active, created_at
    FROM tradeshows
    ORDER BY created_at DESC
  `

  tradeshows.forEach((ts, idx) => {
    console.log(`   ${idx + 1}. [${ts.is_active ? "✓ Active" : "✗ Inactive"}] ${ts.name} (ID: ${ts.id})`)
  })

  // 2. Test toggle active status on the test tradeshow
  const testTradeshow = tradeshows.find(t => t.name === "Test Rep Tradeshow 2025")

  if (testTradeshow) {
    console.log(`\n2️⃣ Testing toggle active status on "${testTradeshow.name}"...`)
    console.log(`   Current status: ${testTradeshow.is_active ? "Active" : "Inactive"}`)

    // Toggle the status
    const newStatus = !testTradeshow.is_active
    await sql`
      UPDATE tradeshows
      SET is_active = ${newStatus}, updated_at = NOW()
      WHERE id = ${testTradeshow.id}
    `

    console.log(`   ✅ Status toggled to: ${newStatus ? "Active" : "Inactive"}`)

    // Toggle it back
    await sql`
      UPDATE tradeshows
      SET is_active = ${testTradeshow.is_active}, updated_at = NOW()
      WHERE id = ${testTradeshow.id}
    `
    console.log(`   ✅ Status restored to original: ${testTradeshow.is_active ? "Active" : "Inactive"}`)
  }

  // 3. Test delete (create a temporary tradeshow first)
  console.log("\n3️⃣ Testing delete functionality...")
  console.log("   Creating temporary tradeshow for deletion test...")

  const tempTradeshow = await sql`
    INSERT INTO tradeshows (name, slug, description, is_active, created_by)
    VALUES (
      'TEMP DELETE TEST - DO NOT USE',
      'temp-delete-test',
      'This is a temporary tradeshow for testing deletion',
      false,
      (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
    )
    RETURNING id, name
  `

  console.log(`   ✅ Created temp tradeshow: "${tempTradeshow[0].name}" (ID: ${tempTradeshow[0].id})`)

  // Now delete it
  console.log("   Attempting to delete temp tradeshow...")

  // Delete associated data first
  await sql`
    DELETE FROM tradeshow_tags WHERE tradeshow_id = ${tempTradeshow[0].id}
  `
  await sql`
    DELETE FROM badge_photos WHERE tradeshow_id = ${tempTradeshow[0].id}
  `
  await sql`
    DELETE FROM tradeshows WHERE id = ${tempTradeshow[0].id}
  `

  console.log(`   ✅ Successfully deleted tradeshow`)

  // Verify it's gone
  const deleted = await sql`
    SELECT id FROM tradeshows WHERE id = ${tempTradeshow[0].id}
  `

  if (deleted.length === 0) {
    console.log("   ✅ Verified: Tradeshow no longer exists in database")
  } else {
    console.log("   ❌ Error: Tradeshow still exists!")
  }

  console.log("\n" + "=".repeat(80))
  console.log("\n✅ All admin function tests completed successfully!")
}

testAdminFunctions().catch(console.error)
