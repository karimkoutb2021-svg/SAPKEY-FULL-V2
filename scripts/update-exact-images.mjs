import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const IMAGE_MAP = {
  "لبنة 400 جرام": "product_labneh_1779868084294.png",
  "شاي أخضر 20 كيس": "product_green_tea_1779868099460.png",
  "شيبسي ملح 150 جرام": "product_salt_chips_1779868125363.png",
  "شوكولاتة أصابع 200 جرام": "product_choc_fingers_1779868137317.png",
  "طماطم معلبة 400 جرام": "product_tomatoes_1779868157628.png",
  "أصابع موزاريلا 300 جرام": "product_mozzarella_1779868170653.png",
  "بطاطس محمرة 1 كجم": "product_fries_1779868184919.png",
  "كرواسون 4 قطع": "product_croissant_1779868197157.png",
  "فطيرة جبنة": "product_cheese_pie_1779868220097.png",
  "حليب طازج كامل الدسم 1 لتر": "product_milk_1779868234716.png",
  "مناديل ورقية 3 رول": "product_paper_towels_1779868250267.png",
  "أكياس قمامة 50 كيس": "product_garbage_bags_1779868266238.png",
  "مناديل وجه 100 منديل": "product_facial_tissues_1779868287654.png",
  "ملح 1 كجم": "product_salt_1779868302039.png",
  "أرز بسمتي 1 كجم": "product_basmati_rice_1779868315292.png",
  "أرز أبيض 1 كجم": "product_basmati_rice_1779868315292.png", // fallback
  "أرز زمزم": "product_basmati_rice_1779868315292.png", // fallback
  "جيلي 80 جرام": "https://images.unsplash.com/photo-1590833989345-420e6f658091?q=80&w=800&auto=format&fit=crop", // high quality jelly photo
  "بونبون 200 جرام": "https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?q=80&w=800&auto=format&fit=crop", // high quality candy
  "مكرونة إيطاليانو سباغيتي": "https://images.unsplash.com/photo-1621996311239-e9357416d860?q=80&w=800&auto=format&fit=crop" // high quality pasta
};

async function run() {
  const { data: products } = await supabase.from('products').select('id, name_ar').limit(20);
  
  // First, nullify all old images to clean up as requested
  await supabase.from('products').update({ image_url: null }).neq('id', '000');

  // Now apply the exact new images
  for (const product of products) {
    let imgName = IMAGE_MAP[product.name_ar];
    if (!imgName) continue;
    
    let imageUrl = imgName.startsWith('http') ? imgName : `/images/products/${imgName}`;
    await supabase.from('products').update({ image_url: imageUrl }).eq('id', product.id);
    console.log(`Updated ${product.name_ar} -> ${imageUrl}`);
  }
  console.log('Update Complete.');
}
run();
