const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const OLD_URL = process.env.SUPABASE_URL || 'https://fpcpqgpbznbsmeqqxmhx.supabase.co';
const OLD_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const oldSb = createClient(OLD_URL, OLD_KEY);

const TABLES = [
  'users', 'categories', 'product_categories', 'products', 'customers',
  'suppliers', 'inventory', 'stock_items', 'treasury_accounts',
  'orders', 'audit_sessions', 'order_pipeline', 'branding_settings',
  'banners', 'audit_logs', 'notifications'
];

async function downloadAll() {
  const backupDir = path.join(__dirname, '..', 'backup-data');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const manifest = [];

  for (const table of TABLES) {
    console.log(`Downloading ${table}...`);
    const allData = [];
    let page = 0;
    const pageSize = 200;

    while (true) {
      const { data, error } = await oldSb
        .from(table)
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.log(`  Cannot access ${table}: ${error.message}`);
        break;
      }

      if (!data || data.length === 0) break;
      allData.push(...data);
      page++;
      if (data.length < pageSize) break;
    }

    const filePath = path.join(backupDir, `${table}.json`);
    fs.writeFileSync(filePath, JSON.stringify(allData, null, 2));
    console.log(`  Saved ${allData.length} rows to ${table}.json`);
    manifest.push({ table, rows: allData.length, file: `${table}.json` });
  }

  fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\nBackup complete! ${backupDir}/`);
  console.log(JSON.stringify(manifest, null, 2));
}

downloadAll().catch(console.error);
