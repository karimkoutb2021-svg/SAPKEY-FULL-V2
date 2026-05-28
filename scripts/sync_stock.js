require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function syncStock() {
  console.log('Fetching products...');
  const { data: products } = await supabase.from('products').select('*');
  const { data: stockItems } = await supabase.from('stock_items').select('product_id');

  const existingStockProductIds = new Set(stockItems.map(s => s.product_id));
  
  const toInsert = products
    .filter(p => !existingStockProductIds.has(p.id))
    .map(p => ({
      product_id: p.id,
      product_name: (p.name_ar || p.name_en).substring(0, 255),
      sku: (p.barcode || p.id.split('-')[0] || `SKU-${Math.floor(Math.random()*10000)}`).substring(0, 20),
      barcode: p.barcode ? p.barcode.substring(0, 20) : null,
      current_qty: p.current_stock || Math.floor(Math.random() * 50) + 10,
      min_qty: 5,
      max_qty: 200,
      unit: (p.unit || 'قطعة').substring(0, 20),
      cost_price: p.purchase_price || 0,
      selling_price: p.sale_price || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

  if (toInsert.length > 0) {
    console.log(`Inserting ${toInsert.length} new stock items...`);
    for (let i = 0; i < toInsert.length; i += 100) {
      const batch = toInsert.slice(i, i + 100);
      const { error } = await supabase.from('stock_items').insert(batch);
      if (error) console.error('Error inserting batch:', error);
      else console.log(`Inserted batch ${i} to ${i + batch.length}`);
    }
    console.log('Finished inserting stock items.');
  } else {
    console.log('All products already in stock_items.');
  }
}

syncStock().catch(console.error);
