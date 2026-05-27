const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Brain path where artifacts were saved
const artifactDir = 'C:\\Users\\PC\\.gemini\\antigravity\\brain\\80dde2b1-812d-473c-bf45-000dc833f292';

const imagesToUpload = [
  { file: 'premium_cooking_oil_1779924013294.png', search: 'زيت طعام 1 لتر' },
  { file: 'premium_fresh_milk_1779924032614.png', search: 'حليب طازج' },
  { file: 'premium_basmati_rice_1779924054575.png', search: 'أرز بسمتي' },
  { file: 'premium_mineral_water_1779924073798.png', search: 'مياه معدنية 1.5 لتر' },
  { file: 'premium_pasta_1779924097547.png', search: 'مكرونة 400 جرام' }
];

async function uploadAndLink() {
  console.log('Uploading amazing AI images to Supabase...');
  
  for (const item of imagesToUpload) {
    const fullPath = path.join(artifactDir, item.file);
    if (!fs.existsSync(fullPath)) {
      console.log('File not found:', fullPath);
      continue;
    }

    const fileBuffer = fs.readFileSync(fullPath);
    const fileName = `products/${Date.now()}_${item.file.replace(/_[0-9]+\.png$/, '.png')}`;
    
    // Upload to bucket
    const { data, error } = await supabase.storage
      .from('storefront')
      .upload(fileName, fileBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) {
      console.error('Error uploading', item.file, error);
      continue;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('storefront')
      .getPublicUrl(fileName);
      
    const publicUrl = urlData.publicUrl;
    console.log(`Uploaded ${item.search}: ${publicUrl}`);

    // Link to products
    const { data: updateData, error: updateError } = await supabase
      .from('products')
      .update({ image_url: publicUrl })
      .ilike('name_ar', `%${item.search}%`);
      
    if (updateError) {
      console.error('Error linking', item.search, updateError);
    } else {
      console.log(`Linked ${item.search} successfully.`);
    }
  }
  
  // Clean up any remaining nulls from previous broken images for safety
  console.log('Done!');
}

uploadAndLink().catch(console.error);
