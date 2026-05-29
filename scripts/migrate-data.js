const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const OLD_URL = process.env.OLD_SUPABASE_URL || 'https://fpcpqgpbznbsmeqqxmhx.supabase.co';
const OLD_KEY = process.env.OLD_SUPABASE_KEY || '';

const NEW_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const NEW_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const oldSb = createClient(OLD_URL, OLD_KEY);
const newSb = createClient(NEW_URL, NEW_KEY);

const TABLE_ORDER = [
  'users',
  'categories',
  'product_categories',
  'products',
  'customers',
  'suppliers',
  'inventory',
  'stock_items',
  'treasury_accounts',
  'orders',
  'audit_sessions',
  'order_pipeline',
  'branding_settings',
  'banners',
  'audit_logs',
  'notifications',
];

async function migrateTable(table, pageSize = 100) {
  console.log(`\nMigrating ${table}...`);
  let page = 0;
  let total = 0;

  while (true) {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await oldSb
      .from(table)
      .select('*', { count: 'exact', head: false })
      .range(from, to);

    if (error) {
      console.error(`  ERROR fetching ${table}:`, error.message);
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) break;

    const { error: insertError } = await newSb.from(table).upsert(data, {
      onConflict: 'id',
      ignoreDuplicates: false,
    });

    if (insertError) {
      console.error(`  ERROR inserting ${table} page ${page}:`, insertError.message);
      return { success: false, error: insertError.message, page };
    }

    total += data.length;
    console.log(`  Page ${page + 1}: ${data.length} rows (total: ${total})`);

    if (data.length < pageSize) break;
    page++;
  }

  console.log(`  Done: ${total} rows migrated`);
  return { success: true, total };
}

async function main() {
  console.log('=== SUPABASE DATA MIGRATION ===');
  console.log(`OLD: ${OLD_URL}`);
  console.log(`NEW: ${NEW_URL}`);
  console.log(`\nTables to migrate: ${TABLE_ORDER.join(', ')}`);

  const results = [];

  for (const table of TABLE_ORDER) {
    const result = await migrateTable(table);
    results.push({ table, ...result });
  }

  console.log('\n=== MIGRATION SUMMARY ===');
  for (const r of results) {
    const status = r.success ? 'OK' : 'FAIL';
    console.log(`  [${status}] ${r.table}: ${r.total || 0} rows${r.error ? ' - ' + r.error : ''}`);
  }

  const successCount = results.filter(r => r.success).length;
  console.log(`\n${successCount}/${results.length} tables migrated successfully`);
}

main().catch(console.error);
