const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function seedInventory() {
  console.log('Seeding inventory data...');

  // 1. Ensure Warehouses exist
  let { data: warehouses } = await supabase.from('warehouses').select('*');
  if (!warehouses || warehouses.length < 2) {
    console.log('Seeding warehouses...');
    const fakeWarehouses = [
      { name: 'Main Warehouse', name_ar: 'المستودع الرئيسي', type: 'main', location: 'القاهرة', is_active: true },
      { name: 'Store A', name_ar: 'فرع المعادي', type: 'store', location: 'المعادي', is_active: true },
      { name: 'Store B', name_ar: 'فرع مدينة نصر', type: 'store', location: 'مدينة نصر', is_active: true },
    ];
    await supabase.from('warehouses').insert(fakeWarehouses);
    const res = await supabase.from('warehouses').select('*');
    warehouses = res.data;
  }

  const w1 = warehouses[0]?.id;
  const w2 = warehouses[1]?.id;

  // 2. Ensure stock_items
  const { data: products } = await supabase.from('products').select('id, name_ar, sku').limit(10);
  let { data: stockItems } = await supabase.from('stock_items').select('*').limit(10);
  
  if (!stockItems || stockItems.length === 0) {
    console.log('Seeding stock items...');
    const newStock = products.map(p => ({
      product_id: p.id,
      product_name: p.name_ar,
      sku: p.sku || `SKU-${Math.floor(Math.random() * 1000)}`,
      current_qty: Math.floor(Math.random() * 500) + 50,
      min_qty: 10,
      max_qty: 1000,
      unit: 'وحدة',
      cost_price: 50,
      selling_price: 75,
      location: 'A1'
    }));
    await supabase.from('stock_items').insert(newStock);
    const res = await supabase.from('stock_items').select('*').limit(10);
    stockItems = res.data;
  }

  // 3. Seed stock_transfers
  const { data: transfers } = await supabase.from('stock_transfers').select('id');
  if (!transfers || transfers.length < 5) {
    console.log('Seeding stock transfers...');
    const fakeTransfers = [];
    const now = new Date();
    for(let i=0; i<6; i++) {
      const date = new Date(now.getTime() - Math.random() * 10 * 24 * 60 * 60 * 1000);
      fakeTransfers.push({
        transfer_number: `TRF-${Math.floor(Math.random() * 10000)}`,
        from_warehouse_id: w1,
        to_warehouse_id: w2,
        status: i % 2 === 0 ? 'completed' : 'pending_approval',
        created_at: date.toISOString()
      });
    }
    await supabase.from('stock_transfers').insert(fakeTransfers);
  }

  // 4. Seed stock_adjustments
  const { data: adjustments } = await supabase.from('stock_adjustments').select('id');
  if (!adjustments || adjustments.length < 5) {
    console.log('Seeding stock adjustments...');
    if (stockItems && stockItems.length > 0) {
      const fakeAdjustments = [];
      const now = new Date();
      for(let i=0; i<6; i++) {
        const date = new Date(now.getTime() - Math.random() * 5 * 24 * 60 * 60 * 1000);
        fakeAdjustments.push({
          stock_id: stockItems[0].id,
          type: i % 2 === 0 ? 'add' : 'remove',
          quantity: Math.floor(Math.random() * 50) + 1,
          reason: 'تسوية جردية لتجربة النظام',
          performed_at: date.toISOString()
        });
      }
      await supabase.from('stock_adjustments').insert(fakeAdjustments);
    }
  }

  // 5. Seed product_history (stock movement)
  const { data: history } = await supabase.from('product_history').select('id');
  if (!history || history.length < 5) {
    console.log('Seeding product history...');
    if (stockItems && stockItems.length > 0) {
      const fakeHistory = [];
      const now = new Date();
      for(let i=0; i<8; i++) {
        const date = new Date(now.getTime() - Math.random() * 15 * 24 * 60 * 60 * 1000);
        fakeHistory.push({
          product_name: stockItems[0].product_name,
          type: i % 2 === 0 ? 'transfer_in' : 'sale',
          quantity: Math.floor(Math.random() * 20) + 5,
          price: 50,
          total_value: 500,
          created_at: date.toISOString()
        });
      }
      await supabase.from('product_history').insert(fakeHistory);
    }
  }

  console.log('Inventory Seed Completed!');
}

seedInventory().catch(console.error);
