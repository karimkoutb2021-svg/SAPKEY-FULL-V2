require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: categories, error: err1 } = await supabase.from('product_categories').select('id, name_ar');
  const { data: products, error: err2 } = await supabase.from('products').select('id, name_ar, category_id');
  
  if (err1) console.error("Categories Error:", err1);
  if (err2) console.error("Products Error:", err2);

  if (!categories || !products) {
    console.log('Error fetching data');
    return;
  }
  
  const emptyCats = [];
  for (const cat of categories) {
    const count = products.filter(p => p.category_id === cat.id).length;
    console.log(`Category ${cat.name_ar}: ${count} products`);
    if (count === 0) {
      emptyCats.push(cat);
    }
  }
  
  if (emptyCats.length > 0) {
    console.log('\nCreating generic products for empty categories...');
    for (const cat of emptyCats) {
      for (let i = 1; i <= 5; i++) {
        const prod = {
          category_id: cat.id,
          name_en: `Product ${i} - ${cat.name_ar}`,
          name_ar: `منتج ${i} - ${cat.name_ar}`,
          barcode: `1000${Math.floor(Math.random() * 1000000)}`,
          sale_price: Math.floor(Math.random() * 100) + 10,
          purchase_price: Math.floor(Math.random() * 50) + 5,
          unit: 'قطعة',
          is_active: true,
          image_url: '/products/generic_product.png'
        };
        await supabase.from('products').insert([prod]);
      }
      console.log(`Created 5 products for ${cat.name_ar}`);
    }
  }
}

check();
