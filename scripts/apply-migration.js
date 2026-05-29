const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function main() {
  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '000_master_migration.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  console.log(`Master migration: ${(sql.length / 1024).toFixed(0)} KB`);

  // Try pg-api/v1/sql endpoint (internal Supabase API)
  const host = new URL(SUPABASE_URL).host;
  console.log(`Trying pg-api at: ${host}/pg-api/v1/sql`);

  const response = await fetch(`https://${host}/pg-api/v1/sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql })
  });

  if (response.ok) {
    console.log('Migration applied successfully!');
    return;
  }

  const text = await response.text();
  console.log('pg-api status:', response.status);
  console.log('pg-api response (first 500 chars):', text.substring(0, 500));

  if (response.status === 404) {
    console.log('\npg-api endpoint not available.');
    console.log('\n=== MANUAL MIGRATION REQUIRED ===');
    console.log('Please run the migration SQL manually in Supabase SQL Editor:');
    console.log('1. Go to: https://supabase.com/dashboard/project/cshpnhzhzahnpvfflsgx/sql/new');
    console.log('2. Open: supabase/migrations/000_master_migration.sql');
    console.log('3. Copy ALL content and paste into the SQL Editor');
    console.log('4. Click "Run" or press Ctrl+Enter');
    console.log('5. After success, run: node scripts/migrate-data.js');
    console.log('\n   Or copy the SQL directly from:');
    console.log('   supabase/migrations/000_master_migration.sql');
    console.log('\n   The file is 143 KB - paste it all at once, Supabase can handle it.');
  }
}

main().catch(console.error);
