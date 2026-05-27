import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const IMAGES = [
  '/images/products/canned_tomatoes_1779834512275.png',
  '/images/products/chocolate_fingers_1779834499395.png',
  '/images/products/croissant_1779834563703.png',
  '/images/products/dairy_category_1779831208388.png',
  '/images/products/french_fries_1779834550268.png',
  '/images/products/fresh_whole_milk_1779834446871.png',
  '/images/products/green_tea_1779834473278.png',
  '/images/products/labneh_1779834460627.png',
  '/images/products/mozzarella_sticks_1779834527313.png',
  '/images/products/nadec_strawberry_yogurt_1779834433145.png',
  '/images/products/salt_chips_1779834485767.png'
];

async function main() {
  const { data: products, error } = await supabase
    .from('products')
    .select('id')
    .limit(20);

  if (error) {
    console.error('Error fetching products', error);
    return;
  }

  console.log(`Found ${products.length} products to update`);

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const image_url = IMAGES[i % IMAGES.length];
    
    await supabase.from('products').update({ image_url }).eq('id', p.id);
    console.log(`Updated product ${p.id} with image ${image_url}`);
  }

  console.log('Done!');
}

main();
