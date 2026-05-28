const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function main() {
  console.log('Fetching categories and products...');
  
  // 1. Get Categories
  const { data: categories, error: catError } = await supabase.from('product_categories').select('*');
  if (catError) {
    console.error('Error fetching categories:', catError);
    return;
  }
  
  // Create a map of categories
  let catMap = {};
  categories.forEach(c => { catMap[c.name_ar.trim()] = c.id; });
  
  const requiredCategories = [
    'البقالة', 'المشروبات', 'منتجات الألبان', 'المخبوزات', 
    'السناكس والحلويات', 'المجمدات', 'المنظفات', 'العناية الشخصية', 'أخرى'
  ];
  
  // Create missing categories
  for (const catName of requiredCategories) {
    if (!catMap[catName]) {
      console.log(`Creating category: ${catName}`);
      const { data, error } = await supabase.from('product_categories').insert([{ 
        name_ar: catName, 
        name_en: catName, 
        is_active: true,
        image_url: `/categories/${catName}.png`
      }]).select().single();
      
      if (!error && data) {
        catMap[catName] = data.id;
      }
    }
  }

  // 2. Get Products
  const { data: products, error: prodError } = await supabase.from('products').select('id, name_ar');
  if (prodError) {
    console.error('Error fetching products:', prodError);
    return;
  }
  
  console.log(`Found ${products.length} products. Categorizing logically...`);
  
  let updates = [];
  
  for (const product of products) {
    const name = product.name_ar.toLowerCase();
    let matchedCategory = 'أخرى';
    
    // Categorization logic based on Egyptian market
    if (name.includes('أرز') || name.includes('سكر') || name.includes('مكرونة') || name.includes('زيت') || name.includes('سمن') || name.includes('دقيق') || name.includes('صلصة') || name.includes('خل')) {
      matchedCategory = 'البقالة';
    } 
    else if (name.includes('مياه') || name.includes('عصير') || name.includes('شاي') || name.includes('قهوة') || name.includes('بيبسي') || name.includes('كوكا') || name.includes('مشروب') || name.includes('نسكافيه')) {
      matchedCategory = 'المشروبات';
    }
    else if (name.includes('جبنة') || name.includes('جبن') || name.includes('حليب') || name.includes('لبن') || name.includes('زبادي') || name.includes('قشطة') || name.includes('زبدة')) {
      matchedCategory = 'منتجات الألبان';
    }
    else if (name.includes('شيبسي') || name.includes('بسكويت') || name.includes('شوكولاتة') || name.includes('كيك') || name.includes('مولتو') || name.includes('ويفر') || name.includes('شيبس')) {
      matchedCategory = 'السناكس والحلويات';
    }
    else if (name.includes('عيش') || name.includes('خبز') || name.includes('توست') || name.includes('كرواسون') || name.includes('فينو') || name.includes('باتيه')) {
      matchedCategory = 'المخبوزات';
    }
    else if (name.includes('برجر') || name.includes('بانيه') || name.includes('ناجتس') || name.includes('سجق') || name.includes('كفتة') || name.includes('لحم مجمد') || name.includes('خضار مجمد') || name.includes('بسمة') || name.includes('مونتانا')) {
      matchedCategory = 'المجمدات';
    }
    else if (name.includes('برسيل') || name.includes('اريال') || name.includes('صابون') || name.includes('مسحوق') || name.includes('سائل') || name.includes('فيري') || name.includes('ديتول') || name.includes('منظف') || name.includes('جل')) {
      matchedCategory = 'المنظفات';
    }
    else if (name.includes('شامبو') || name.includes('معجون') || name.includes('فرشاة') || name.includes('مزيل') || name.includes('حفاضات') || name.includes('بامبرز')) {
      matchedCategory = 'العناية الشخصية';
    }
    
    // Additional fix for any known miscategorized stuff like Tuna
    if (name.includes('تونه') || name.includes('تونة')) matchedCategory = 'البقالة';
    if (name.includes('بيض')) matchedCategory = 'منتجات الألبان';

    const catId = catMap[matchedCategory];
    
    if (catId) {
      updates.push({
        id: product.id,
        category_id: catId
      });
    }
  }
  
  // 3. Batch Update
  console.log(`Applying ${updates.length} updates...`);
  
  // Supabase doesn't have a direct mass update, so we can use upsert or loop
  // Let's use loop for safety since it's just a one-time script
  let count = 0;
  for (const update of updates) {
    await supabase.from('products').update({ category_id: update.category_id }).eq('id', update.id);
    count++;
    if (count % 20 === 0) console.log(`Updated ${count}/${updates.length}...`);
  }
  
  console.log('✅ Done categorizing all products logically!');
}

main();
