const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

async function main() {
  const oldSb = createClient(
    process.env.OLD_SUPABASE_URL || 'https://fpcpqgpbznbsmeqqxmhx.supabase.co',
    process.env.OLD_SUPABASE_KEY || ''
  );
  const newSb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cshpnhzhzahnpvfflsgx.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  const tablesToCheck = [
    'products', 'categories', 'product_categories', 'orders', 'users',
    'customers', 'inventory', 'suppliers', 'stock_items',
    'treasury_accounts', 'audit_sessions', 'order_pipeline',
    'audit_logs', 'notifications', 'banners', 'branding_settings'
  ];

  for (const [label, sb] of [['OLD', oldSb], ['NEW', newSb]]) {
    console.log(`\n=== ${label} SUPABASE ===`);
    for (const table of tablesToCheck) {
      try {
        const { data, error, count } = await sb.from(table).select('*', { count: 'exact', head: true });
        if (!error) {
          console.log(`  [OK] ${table} (${count || 0} rows)`);
        } else {
          console.log(`  [NO] ${table}: ${error.message.substring(0, 60)}`);
        }
      } catch (e) {
        console.log(`  [ER] ${table}: ${e.message.substring(0, 60)}`);
      }
    }
  }
}

main().catch(console.error);
