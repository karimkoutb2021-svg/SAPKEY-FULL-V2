const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cshpnhzhzahnpvfflsgx.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const productsToSeed = [
  { slug: 'canned', sku: 'CANNED-001', name_ar: 'طماطم معلبة 400 جرام', name_en: 'Canned Tomatoes 400g', unit: 'علبة', unit_price: 8.00, sale_price: 7.00, cost_price: 5.00, current_stock: 300, image_url: '/product_tomatoes_1779868157628.png' },
  { slug: 'dairy', sku: 'DAIRY-001', name_ar: 'حليب طازج كامل الدسم 1 لتر', name_en: 'Full Cream Milk 1L', unit: 'لتر', unit_price: 6.00, sale_price: 5.50, cost_price: 4.00, current_stock: 200, image_url: '/product_milk_1779868234716.png' },
  { slug: 'frozen', sku: 'FROZEN-003', name_ar: 'بطاطس محمرة 1 كجم', name_en: 'French Fries 1kg', unit: 'كيس', unit_price: 25.00, sale_price: 22.00, cost_price: 16.00, current_stock: 120, image_url: '/product_fries_1779868184919.png' },
  { slug: 'bakery', sku: 'BAKERY-005', name_ar: 'فطيرة جبنة', name_en: 'Cheese Pie', unit: 'قطعة', unit_price: 8.00, sale_price: 7.00, cost_price: 5.00, current_stock: 150, image_url: '/product_cheese_pie_1779868220097.png' },
  { slug: 'snacks', sku: 'SNACK-010', name_ar: 'شوكولاتة أصابع 200 جرام', name_en: 'Chocolate Fingers 200g', unit: 'علبة', unit_price: 25.00, sale_price: 22.00, cost_price: 16.00, current_stock: 140, image_url: '/product_choc_fingers_1779868137317.png' },
  { slug: 'bakery', sku: 'BAKERY-004', name_ar: 'كرواسون 4 قطع', name_en: 'Croissant 4pcs', unit: 'علبة', unit_price: 20.00, sale_price: 18.00, cost_price: 12.00, current_stock: 100, image_url: '/product_croissant_1779868197157.png' },
  { slug: 'personal', sku: 'PERSONAL-008', name_ar: 'مناديل وجه 100 منديل', name_en: 'Facial Tissues 100pcs', unit: 'علبة', unit_price: 10.00, sale_price: 9.00, cost_price: 6.00, current_stock: 300, image_url: '/product_facial_tissues_1779868287654.png' },
  { slug: 'cleaning', sku: 'CLEAN-007', name_ar: 'أكياس قمامة 50 كيس', name_en: 'Garbage Bags 50pcs', unit: 'رول', unit_price: 12.00, sale_price: 10.00, cost_price: 7.00, current_stock: 180, image_url: '/product_garbage_bags_1779868266238.png' },
  { slug: 'beverages', sku: 'BEV-010', name_ar: 'شاي أخضر 20 كيس', name_en: 'Green Tea 20 Bags', unit: 'علبة', unit_price: 18.00, sale_price: 16.00, cost_price: 12.00, current_stock: 200, image_url: '/product_green_tea_1779868099460.png' },
  { slug: 'dairy', sku: 'DAIRY-010', name_ar: 'لبنة 400 جرام', name_en: 'Labneh 400g', unit: 'عبوة', unit_price: 18.00, sale_price: 16.00, cost_price: 12.00, current_stock: 110, image_url: '/product_labneh_1779868084294.png' },
  { slug: 'dairy', sku: 'DAIRY-009', name_ar: 'جبنة موزاريلا 250 جرام', name_en: 'Mozzarella Cheese 250g', unit: 'عبوة', unit_price: 28.00, sale_price: 26.00, cost_price: 20.00, current_stock: 70, image_url: '/product_mozzarella_1779868170653.png' },
  { slug: 'cleaning', sku: 'CLEAN-006', name_ar: 'مناديل ورقية 3 رول', name_en: 'Paper Towels 3 Rolls', unit: 'عبوة', unit_price: 15.00, sale_price: 13.00, cost_price: 9.00, current_stock: 200, image_url: '/product_paper_towels_1779868250267.png' },
  { slug: 'spices', sku: 'SPICE-001', name_ar: 'ملح 1 كجم', name_en: 'Salt 1kg', unit: 'كيس', unit_price: 5.00, sale_price: 4.00, cost_price: 2.50, current_stock: 400, image_url: '/product_salt_1779868302039.png' },
  { slug: 'snacks', sku: 'SNACK-001', name_ar: 'شيبسي ملح 150 جرام', name_en: 'Salt Chips 150g', unit: 'كيس', unit_price: 12.00, sale_price: 10.00, cost_price: 7.00, current_stock: 300, image_url: '/product_salt_chips_1779868125363.png' },
  { slug: 'pasta', sku: 'PASTA-004', name_ar: 'أرز بسمتي 1 كجم', name_en: 'Basmati Rice 1kg', unit: 'كيس', unit_price: 25.00, sale_price: 22.00, cost_price: 16.00, current_stock: 200, image_url: '/product_basmati_rice_1779868315292.png' },
];

async function run() {
  console.log('Deactivating all existing products...');
  await supabase.from('products').update({ is_active: false, image_url: null }).neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('Fetching categories...');
  const { data: categories, error: catError } = await supabase
    .from('product_categories')
    .select('id, slug, name_ar');

  if (catError) {
    console.error('Error fetching categories:', catError.message);
    process.exit(1);
  }

  const catMap = {};
  categories.forEach(c => { catMap[c.slug] = c.id; });

  let totalInserted = 0;
  
  for (const p of productsToSeed) {
    const categoryId = catMap[p.slug];
    if (!categoryId) {
      console.log(`Category ${p.slug} not found, skipping...`);
      continue;
    }

    const { data, error } = await supabase
      .from('products')
      .upsert({
        sku: p.sku,
        name_ar: p.name_ar,
        name_en: p.name_en,
        category_id: categoryId,
        unit: p.unit,
        unit_price: p.unit_price,
        sale_price: p.sale_price,
        cost_price: p.cost_price,
        current_stock: p.current_stock,
        is_active: true,
        image_url: p.image_url,
        tax_rate: 15,
        has_expiry: false,
      }, { onConflict: 'sku' })
      .select();

    if (error) {
      console.error(`Error inserting ${p.sku}:`, error.message);
    } else {
      totalInserted++;
    }
  }

  console.log(`\nTotal AI products inserted/updated: ${totalInserted}`);
}

run();
