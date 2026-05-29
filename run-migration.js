require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://cshpnhzhzahnpvfflsgx.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY not found in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = fs.readFileSync('supabase/migrations/006_seed_all_categories.sql', 'utf8');

async function run() {
  console.log('Running migration 006_seed_all_categories.sql...');
  
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.error('Error running migration:', error.message);
    console.log('\nPlease run this SQL manually in Supabase SQL Editor:');
    console.log('https://supabase.com/dashboard/project/fpcpqgpbznbsmeqqxmhx/sql/new');
    process.exit(1);
  }
  
  console.log('Migration completed successfully!');
  
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('*, product_categories(name_ar)')
    .order('created_at', { ascending: false });
    
  if (prodError) {
    console.error('Error fetching products:', prodError.message);
    return;
  }
  
  console.log(`\nTotal products: ${products?.length || 0}`);
  
  const categoryCount = {};
  products?.forEach(p => {
    const catName = p.product_categories?.name_ar || 'Uncategorized';
    categoryCount[catName] = (categoryCount[catName] || 0) + 1;
  });
  
  console.log('\nProducts per category:');
  Object.entries(categoryCount).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`);
  });
}

run();
