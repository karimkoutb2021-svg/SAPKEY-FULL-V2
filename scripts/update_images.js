require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function updateImages() {
  const { data: products } = await supabase.from('products').select('id, name_ar').filter('image_url', 'is', null);
  
  if (!products) {
    console.log('No products to update');
    return;
  }

  for (const p of products) {
    let image = '/products/generic_product.png';
    const name = p.name_ar || '';
    
    if (name.includes('زيت') || name.includes('سمن')) {
      image = '/products/cooking_oil.png';
    } else if (name.includes('مكرونة') || name.includes('أرز') || name.includes('ارز') || name.includes('لازانيا') || name.includes('نودلز')) {
      image = '/products/pasta.png';
    } else if (name.includes('صلصة') || name.includes('طماطم')) {
      image = '/products/tomato_paste.png';
    } else if (name.includes('تونة') || name.includes('سردين') || name.includes('جمبري') || name.includes('سمك')) {
      image = '/products/generic_product.png'; // No specific image for tuna generated yet
    }

    const { error } = await supabase.from('products').update({ image_url: image }).eq('id', p.id);
    if (error) console.error(`Error updating ${name}:`, error);
  }
  
  console.log('Finished updating product images.');
}
updateImages().catch(console.error);
