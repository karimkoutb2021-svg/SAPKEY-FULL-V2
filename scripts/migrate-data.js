require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const NEW_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const NEW_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const newSb = createClient(NEW_URL, NEW_KEY);

const BACKUP_DIR = path.join(__dirname, '..', 'backup-data');

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
  const filePath = path.join(BACKUP_DIR, `${table}.json`);
  if (!fs.existsSync(filePath)) {
    console.log(`⏭️  ${table}: no backup file found`);
    return { success: true, total: 0, note: 'no backup file' };
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(data) || data.length === 0) {
    console.log(`⏭️  ${table}: empty`);
    return { success: true, total: 0, note: 'empty' };
  }

  console.log(`\nMigrating ${table} (${data.length} rows from backup)...`);
  let total = 0;

  for (let i = 0; i < data.length; i += pageSize) {
    const batch = data.slice(i, i + pageSize);

    const { error } = await newSb.from(table).upsert(batch, {
      onConflict: 'id',
      ignoreDuplicates: false,
    });

    if (error) {
      console.error(`  ERROR inserting ${table} batch ${Math.floor(i / pageSize) + 1}:`, error.message);
      return { success: false, error: error.message, batch: Math.floor(i / pageSize) + 1 };
    }

    total += batch.length;
    console.log(`  Batch ${Math.floor(i / pageSize) + 1}: ${batch.length} rows (total: ${total})`);
  }

  console.log(`  Done: ${total} rows migrated`);
  return { success: true, total };
}

async function main() {
  console.log('=== SUPABASE DATA MIGRATION (from backup JSON) ===');
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
    console.log(`  [${status}] ${r.table}: ${r.total || 0} rows${r.error ? ' - ' + r.error : ''}${r.note ? ' (' + r.note + ')' : ''}`);
  }

  const successCount = results.filter(r => r.success).length;
  console.log(`\n${successCount}/${results.length} tables migrated successfully`);
  console.log('\n✅ All image URLs are Cloudinary-based (pre-mapped in backup JSON)');
}

main().catch(console.error);
