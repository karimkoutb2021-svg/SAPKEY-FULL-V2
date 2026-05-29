const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL || 'https://cshpnhzhzahnpvfflsgx.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY);

const map = {
  canned: '/product_tomatoes_1779868157628.png',
  dairy: '/product_milk_1779868234716.png',
  frozen: '/product_fries_1779868184919.png',
  bakery: '/product_croissant_1779868197157.png',
  snacks: '/product_salt_chips_1779868125363.png',
  personal: '/product_facial_tissues_1779868287654.png',
  cleaning: '/product_paper_towels_1779868250267.png',
  beverages: '/product_green_tea_1779868099460.png',
  spices: '/product_salt_1779868302039.png',
  pasta: '/product_basmati_rice_1779868315292.png'
};

async function run() {
  for (const [slug, img] of Object.entries(map)) {
    await supabase.from('product_categories').update({ image_url: img }).eq('slug', slug);
  }
  console.log('Categories updated!');
}
run();
