const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function main() {
  const { data: categories } = await supabase.from('product_categories').select('*');
  let catMap = {};
  categories.forEach(c => { catMap[c.name_ar.trim()] = c.id; });

  const { data: products } = await supabase.from('products').select('id, name_ar');
  
  let updates = [];
  
  for (const product of products) {
    const name = product.name_ar.toLowerCase();
    let matchedCategory = null;
    
    // Priority 1: Specific exact match overrides
    if (name.includes('بسكويت') || name.includes('شيبس') || name.includes('كيك') || name.includes('شوكولاتة')) {
      matchedCategory = 'السناكس والحلويات';
    } else if (name.includes('تونة') || name.includes('تونه') || name.includes('مكرونة') || name.includes('ارز') || name.includes('أرز')) {
      matchedCategory = 'البقالة';
    } else if (name.includes('مياه') || name.includes('عصير') || (name.includes('شاي') && !name.includes('بسكويت')) || name.includes('قهوة')) {
      matchedCategory = 'المشروبات';
    }

    if (matchedCategory && catMap[matchedCategory]) {
      updates.push({
        id: product.id,
        category_id: catMap[matchedCategory]
      });
    }
  }
  
  let count = 0;
  for (const update of updates) {
    await supabase.from('products').update({ category_id: update.category_id }).eq('id', update.id);
    count++;
  }
  console.log(`Fixed ${count} products.`);
}

main();
