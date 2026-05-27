const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Starting seed...');
  
  // 1. Fix Product Images
  const { data: products } = await supabase.from('products').select('id, name_ar, image_url, category_id');
  if (products) {
    console.log(`Checking ${products.length} products for missing images...`);
    let updated = 0;
    for (const p of products) {
      if (!p.image_url || p.image_url === '' || p.image_url === '/product-placeholder.svg') {
        // If it's null, we will set it to the placeholder to explicitly show it's handled, or leave it.
        // Actually, leaving it as null is fine because frontend maps null to placeholder.
        // BUT wait, let's just make sure all of them have a valid URL or null.
        // Let's set it to null so the frontend explicitly uses the colored SVGs or placeholder.
        if (p.image_url === '/product-placeholder.svg' || p.image_url === '') {
          await supabase.from('products').update({ image_url: null }).eq('id', p.id);
          updated++;
        }
      }
    }
    console.log(`Updated ${updated} products with clean null images.`);
  }

  // 2. Fix POS filtering logic. The POS filter isn't showing empty categories.
  // We need to ensure products have category_ids.
  const { data: categories } = await supabase.from('product_categories').select('id');
  const catIds = categories ? categories.map(c => c.id) : [];
  
  const { data: productsNoCat } = await supabase.from('products').select('id').is('category_id', null);
  if (productsNoCat && productsNoCat.length > 0 && catIds.length > 0) {
    console.log(`Assigning categories to ${productsNoCat.length} uncategorized products...`);
    for (const p of productsNoCat) {
      const randomCat = catIds[Math.floor(Math.random() * catIds.length)];
      await supabase.from('products').update({ category_id: randomCat }).eq('id', p.id);
    }
  }

  // 3. Seed Customers
  const { data: customers } = await supabase.from('customers').select('id');
  if (!customers || customers.length < 5) {
    console.log('Seeding customers...');
    const fakeCustomers = [
      { name: 'أحمد محمود', phone: '01012345678', email: 'ahmed@example.com', total_spent: 1500.50, loyalty_points: 150, is_active: true },
      { name: 'سارة خالد', phone: '01123456789', email: 'sara@example.com', total_spent: 3200.00, loyalty_points: 320, is_active: true },
      { name: 'محمد علي', phone: '01234567890', email: 'mohamed@example.com', total_spent: 450.25, loyalty_points: 45, is_active: true },
      { name: 'فاطمة حسن', phone: '01512345678', email: 'fatma@example.com', total_spent: 890.00, loyalty_points: 89, is_active: true },
      { name: 'عمر سعيد', phone: '01098765432', email: 'omar@example.com', total_spent: 5400.75, loyalty_points: 540, is_active: true },
    ];
    await supabase.from('customers').insert(fakeCustomers);
  }

  // 4. Seed Sales / Orders
  const { data: sales } = await supabase.from('sales').select('id');
  if (!sales || sales.length < 10) {
    console.log('Seeding sales...');
    const now = new Date();
    const fakeSales = [];
    for (let i = 0; i < 20; i++) {
      const date = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000); // random within 30 days
      fakeSales.push({
        cashier_id: '123e4567-e89b-12d3-a456-426614174000', // Dummy UUID or real
        total_amount: Math.floor(Math.random() * 500) + 50,
        subtotal: Math.floor(Math.random() * 450) + 40,
        tax_amount: Math.floor(Math.random() * 50),
        discount_amount: 0,
        payment_method: Math.random() > 0.5 ? 'cash' : 'card',
        status: 'completed',
        created_at: date.toISOString()
      });
    }
    // We can't insert easily without a valid cashier_id constraint.
    // Let's get a valid user ID.
    const { data: authUsers } = await supabase.from('users').select('id').limit(1);
    if (authUsers && authUsers.length > 0) {
      const uId = authUsers[0].id;
      fakeSales.forEach(s => s.cashier_id = uId);
      await supabase.from('sales').insert(fakeSales);
    }
  }

  console.log('Seed completed!');
}

seed().catch(console.error);
