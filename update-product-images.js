const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fpcpqgpbznbsmeqqxmhx.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Category-based placeholder images (using public placeholder services)
const categoryImages = {
  dairy: 'https://images.unsplash.com/photo-1628088062854-d1870b4547ce?w=400&h=400&fit=crop',
  beverages: 'https://images.unsplash.com/photo-1544145945-f90429727588?w=400&h=400&fit=crop',
  snacks: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400&h=400&fit=crop',
  canned: 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=400&h=400&fit=crop',
  frozen: 'https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?w=400&h=400&fit=crop',
  bakery: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop',
  cleaning: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=400&h=400&fit=crop',
  personal: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop',
  spices: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=400&fit=crop',
  oils: 'https://images.unsplash.com/photo-1474979266532-933afb1b5aba?w=400&h=400&fit=crop',
  pasta: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=400&h=400&fit=crop',
  sweets: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400&h=400&fit=crop',
  vegetables: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=400&fit=crop',
  fruits: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&h=400&fit=crop',
  meat: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400&h=400&fit=crop',
  seafood: 'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=400&h=400&fit=crop',
  breakfast: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=400&fit=crop',
  baby: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&h=400&fit=crop',
  pet: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400&h=400&fit=crop',
};

// Product-specific images for common products
const productImages = {
  'حليب': 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=400&fit=crop',
  'زبادي': 'https://images.unsplash.com/photo-1488477181980-3c4d2b7e7e1c?w=400&h=400&fit=crop',
  'جبن': 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&h=400&fit=crop',
  'مياه': 'https://images.unsplash.com/photo-1548839135-2b441275f287?w=400&h=400&fit=crop',
  'عصير': 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&h=400&fit=crop',
  'بيبسي': 'https://images.unsplash.com/photo-1629203891104-786b2a8b9b2e?w=400&h=400&fit=crop',
  'كوكاكولا': 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=400&fit=crop',
  'شيبسي': 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&h=400&fit=crop',
  'بسكويت': 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=400&fit=crop',
  'شوكولاتة': 'https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=400&h=400&fit=crop',
  'خبز': 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400&h=400&fit=crop',
  'تونة': 'https://images.unsplash.com/photo-1597733183260-e4e4e7e2a6b6?w=400&h=400&fit=crop',
  'مكرونة': 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=400&h=400&fit=crop',
  'أرز': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop',
  'زيت': 'https://images.unsplash.com/photo-1474979266532-933afb1b5aba?w=400&h=400&fit=crop',
  'سمن': 'https://images.unsplash.com/photo-1589985270820-4e57ae4bc344?w=400&h=400&fit=crop',
  'ملح': 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=400&fit=crop',
  'فلفل': 'https://images.unsplash.com/photo-1599909533601-aa23a189e5e8?w=400&h=400&fit=crop',
  'قهوة': 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=400&fit=crop',
  'شاي': 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=400&fit=crop',
  'مسحوق غسيل': 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=400&h=400&fit=crop',
  'صابون': 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop',
  'شامبو': 'https://images.unsplash.com/photo-1585232004423-244e0e6904e3?w=400&h=400&fit=crop',
  'فراخ': 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=400&h=400&fit=crop',
  'بطاطس': 'https://images.unsplash.com/photo-1518977676601-b53f82ber40?w=400&h=400&fit=crop',
  'بيتزا': 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=400&fit=crop',
  'آيس كريم': 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=400&h=400&fit=crop',
  'عسل': 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=400&fit=crop',
  'نودلز': 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=400&h=400&fit=crop',
  'فول': 'https://images.unsplash.com/photo-1515543904279-0a12a8b0f437?w=400&h=400&fit=crop',
  'ذرة': 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=400&h=400&fit=crop',
  'زيتون': 'https://images.unsplash.com/photo-1474979266532-933afb1b5aba?w=400&h=400&fit=crop',
  'كلور': 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=400&h=400&fit=crop',
  'مناديل': 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400&h=400&fit=crop',
  'معجون أسنان': 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop',
};

async function updateProductImages() {
  console.log('Fetching products without images...');
  
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name_ar, category_id, image_url, product_categories(slug)')
    .is('image_url', null);
  
  if (error) {
    console.error('Error fetching products:', error.message);
    return;
  }
  
  console.log(`Found ${products?.length || 0} products without images`);
  
  let updated = 0;
  let skipped = 0;
  
  for (const product of products || []) {
    const nameAr = product.name_ar || '';
    const categorySlug = product.product_categories?.slug || '';
    
    // Find matching product image
    let imageUrl = null;
    for (const [keyword, img] of Object.entries(productImages)) {
      if (nameAr.includes(keyword)) {
        imageUrl = img;
        break;
      }
    }
    
    // Fallback to category image
    if (!imageUrl && categorySlug && categoryImages[categorySlug]) {
      imageUrl = categoryImages[categorySlug];
    }
    
    if (imageUrl) {
      const { error: updateError } = await supabase
        .from('products')
        .update({ image_url: imageUrl })
        .eq('id', product.id);
      
      if (updateError) {
        console.error(`Error updating ${nameAr}:`, updateError.message);
        skipped++;
      } else {
        console.log(`✓ ${nameAr} -> ${imageUrl.substring(0, 50)}...`);
        updated++;
      }
    } else {
      console.log(`⚠ No image found for: ${nameAr}`);
      skipped++;
    }
  }
  
  console.log(`\nDone! Updated: ${updated}, Skipped: ${skipped}`);
  
  // Verify
  const { count } = await supabase.from('products').select('*', { count: 'exact', head: true });
  const { count: withImages } = await supabase.from('products').select('*', { count: 'exact', head: true }).not('image_url', 'is', null);
  console.log(`\nTotal products: ${count}`);
  console.log(`Products with images: ${withImages}`);
}

updateProductImages();
