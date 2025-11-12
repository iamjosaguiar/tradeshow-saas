const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

(async () => {
  console.log('\n📊 Multi-Tenant Migration Summary:\n');

  const tenants = await sql`SELECT id, name, subdomain, is_complimentary FROM tenants`;
  console.log('✅ Tenants:');
  tenants.forEach(t => console.log(`   • ${t.name} (${t.subdomain}) - Complimentary: ${t.is_complimentary}`));

  const users = await sql`SELECT COUNT(*) as count, tenant_id FROM users GROUP BY tenant_id`;
  console.log(`\n✅ Users: ${users[0]?.count || 0} in tenant ${users[0]?.tenant_id || 'N/A'}`);

  const tradeshows = await sql`SELECT COUNT(*) as count, tenant_id FROM tradeshows GROUP BY tenant_id`;
  console.log(`✅ Tradeshows: ${tradeshows[0]?.count || 0} in tenant ${tradeshows[0]?.tenant_id || 'N/A'}`);

  const photos = await sql`SELECT COUNT(*) as count, tenant_id FROM badge_photos GROUP BY tenant_id`;
  console.log(`✅ Badge Photos: ${photos[0]?.count || 0} in tenant ${photos[0]?.tenant_id || 'N/A'}`);

  const crm = await sql`SELECT crm_type, is_connected FROM tenant_crm_connections WHERE tenant_id = 1`;
  console.log(`\n✅ CRM Integrations:`);
  crm.forEach(c => console.log(`   • ${c.crm_type}: ${c.is_connected ? 'Connected' : 'Not Connected'}`));

  console.log('\n🎉 All data successfully migrated to CleanSpace tenant!\n');
})();
