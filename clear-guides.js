require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function main() {
  const { data, error } = await supabase.from('guide_content').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Cleared guides:', error ? error : 'Success');
}

main();
