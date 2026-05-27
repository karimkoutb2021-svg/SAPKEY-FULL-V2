const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL || 'https://fpcpqgpbznbsmeqqxmhx.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY);

async function clean() {
  const buckets = ['products', 'categories', 'banners'];
  for (const b of buckets) {
    const { data: files } = await supabase.storage.from(b).list();
    if (files && files.length > 0) {
      const paths = files.map(f => f.name);
      await supabase.storage.from(b).remove(paths);
      console.log(`Deleted ${paths.length} files from ${b} bucket`);
    } else {
      console.log(`No files to delete in ${b} bucket`);
    }
  }
  console.log('Done!');
}
clean();
