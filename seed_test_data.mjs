import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cshpnhzhzahnpvfflsgx.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seed() {
  console.log('Starting DB Seed...');

  let { data: users } = await supabase.from('users').select('id, role').limit(50);
  const cashier = users?.find(u => u.role === 'cashier' || u.role === 'admin' || u.role === 'manager') || users?.[0];
  const customer = users?.find(u => u.role === 'customer') || users?.[0];
  
  if (!cashier) {
    console.log('Error: Need at least one user to act as creator.');
    return;
  }

  // Get products
  let { data: products } = await supabase.from('products').select('id, sale_price, name_ar').limit(5);
  if (!products || products.length === 0) {
    console.log('No products found. Creating dummy products...');
    const dummyProducts = [
      { name_ar: 'منتج أ', name_en: 'Product A', category_id: null, sale_price: 100, cost_price: 80, sku: 'PROD-A', unit: 'piece', barcode: '123' },
      { name_ar: 'منتج ب', name_en: 'Product B', category_id: null, sale_price: 50, cost_price: 30, sku: 'PROD-B', unit: 'piece', barcode: '124' },
      { name_ar: 'منتج ج', name_en: 'Product C', category_id: null, sale_price: 200, cost_price: 150, sku: 'PROD-C', unit: 'piece', barcode: '125' },
    ];
    await supabase.from('products').insert(dummyProducts);
    const { data: newProducts } = await supabase.from('products').select('id, sale_price, name_ar').limit(5);
    products = newProducts;
  }

  // Create Orders
  for (let i = 0; i < 5; i++) {
    const numItems = Math.floor(Math.random() * 3) + 1;
    const orderItems = [];
    let subtotal = 0;

    for (let j = 0; j < numItems; j++) {
      const p = products[Math.floor(Math.random() * products.length)];
      const qty = Math.floor(Math.random() * 3) + 1;
      subtotal += p.sale_price * qty;
      orderItems.push({
        productId: p.id,
        name: p.name_ar,
        quantity: qty,
        price: p.sale_price,
      });
    }

    const { data: order, error: orderErr } = await supabase.from('orders').insert({
      customer_id: null,
      status: i % 2 === 0 ? 'delivered' : 'pending',
      payment_method: i % 2 === 0 ? 'cash' : 'card',
      total: subtotal,
      items: orderItems, // Storing in JSON column based on schema
      customer_name: 'Test Customer',
      phone: '01000000000',
    }).select().single();

    if (orderErr) {
      console.error('Error creating order:', orderErr);
      continue;
    }

    console.log(`Created Order ${order.id} with ${numItems} items. Total: ${subtotal}`);

    // Create journal entry if paid
    if (order.status === 'delivered') {
      const { data: entry } = await supabase.from('journal_entries').insert({
        date: new Date().toISOString(),
        description: `مبيعات طلب #${order.id.slice(0, 8)}`,
        reference_type: 'order',
        reference_id: order.id,
        created_by: cashier.id
      }).select().single();

      if (entry) {
        await supabase.from('journal_lines').insert([
          { journal_entry_id: entry.id, account_id: null, debit: subtotal, credit: 0, description: 'نقدية من المبيعات' },
          { journal_entry_id: entry.id, account_id: null, debit: 0, credit: subtotal, description: 'إيرادات مبيعات' }
        ]);
        console.log(`Added Journal Entry for Order ${order.id}`);
      }
    }
  }

  console.log('Seed Complete!');
}

seed().catch(console.error);
