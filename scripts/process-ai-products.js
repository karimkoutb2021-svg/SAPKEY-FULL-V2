const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

const artifactsDir = 'C:/Users/PC/.gemini/antigravity/brain/80dde2b1-812d-473c-bf45-000dc833f292';
const publicDir = path.join(__dirname, '../public/images/products');

if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

const productsMap = {
  'cb32d480-17cc-4c99-a3fa-63c714fafcf9': 'nadec_strawberry_yogurt_1779834433145.png', // زبادي نادك 170 جرام فراولة
  'b42060d2-6356-4dda-93ba-fec7d377750b': 'fresh_whole_milk_1779834446871.png', // حليب طازج كامل الدسم 1 لتر
  'c43d1af0-d93f-4cd3-837d-2565df30ee1d': 'labneh_1779834460627.png', // لبنة 400 جرام
  'cb2feac1-dd96-4fb2-87e9-15d72e9a943d': 'green_tea_1779834473278.png', // شاي أخضر 20 كيس
  '35e70451-a940-4814-9024-c8b0b2a3c851': 'salt_chips_1779834485767.png', // شيبسي ملح 150 جرام
  '63beb966-4d39-4389-866f-081bfc7e31cd': 'chocolate_fingers_1779834499395.png', // شوكولاتة أصابع 200 جرام
  '0d6a0be4-e9ae-4e2d-a224-8a3199079780': 'canned_tomatoes_1779834512275.png', // طماطم معلبة 400 جرام
  '36e3dbdb-1891-4395-b4b9-fd5495ac3875': 'mozzarella_sticks_1779834527313.png', // أصابع موزاريلا 300 جرام
  '4fdca60c-00a7-4893-9a3f-1c4e644b8fbc': 'french_fries_1779834550268.png', // بطاطس محمرة 1 كجم
  'c81ce713-b35d-4457-8ee0-c96ad16d8872': 'croissant_1779834563703.png', // كرواسون 4 قطع
};

async function processAndSync() {
  for (const [id, filename] of Object.entries(productsMap)) {
    const sourcePath = path.join(artifactsDir, filename);
    if (!fs.existsSync(sourcePath)) {
      console.log(`Missing ${sourcePath}`);
      continue;
    }
    const destName = `${id}.webp`;
    const destPath = path.join(publicDir, destName);
    const publicUrl = `/images/products/${destName}`;
    
    try {
      await sharp(sourcePath).resize(800, 800, { fit: 'cover' }).webp({ quality: 80 }).toFile(destPath);
      console.log(`Processed ${destName}`);
      
      const { error } = await supabase.from('products').update({ image_url: publicUrl }).eq('id', id);
      if (error) {
        console.error(`DB Error for ${id}:`, error);
      } else {
        console.log(`Synced DB for ${id}`);
      }
    } catch (e) {
      console.error(`Error processing ${filename}:`, e);
    }
  }
}

processAndSync();
