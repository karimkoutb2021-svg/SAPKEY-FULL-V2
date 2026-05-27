const { Client } = require('pg');

const client = new Client({
  host: 'aws-0-eu-west-1.pooler.supabase.com',
  port: 6543,
  user: 'postgres.fpcpqgpbznbsmeqqxmhx',
  password: 'Msbchz@12345@',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  try {
    // 1. Insert Warehouses
    await client.query(`
      INSERT INTO warehouses (name_ar, code)
      VALUES 
      ('المستودع الرئيسي', 'WH-MAIN'),
      ('مستودع العبور', 'WH-TRN'),
      ('مستودع فرع التجمع', 'WH-BR1')
    `);

    // 2. Set all products to active
    await client.query(`UPDATE products SET is_active = true;`);

    // 3. Ensure categories have products.
    // Fetch all categories
    const { rows: categories } = await client.query('SELECT id FROM product_categories;');
    if (categories.length > 0) {
      // Fetch products without category
      const { rows: noCatProds } = await client.query('SELECT id FROM products WHERE category_id IS NULL;');
      let catIndex = 0;
      for (const p of noCatProds) {
        await client.query(`UPDATE products SET category_id = $1 WHERE id = $2`, [categories[catIndex % categories.length].id, p.id]);
        catIndex++;
      }
      
      // Also ensure EVERY category has at least 3 products
      for (const cat of categories) {
        const { rows: count } = await client.query(`SELECT COUNT(*) FROM products WHERE category_id = $1`, [cat.id]);
        if (parseInt(count[0].count) < 3) {
           const needed = 3 - parseInt(count[0].count);
           // Take 'needed' random products from other categories and reassign them
           const { rows: randomProds } = await client.query(`SELECT id FROM products WHERE category_id != $1 LIMIT $2`, [cat.id, needed]);
           for (const rp of randomProds) {
             await client.query(`UPDATE products SET category_id = $1 WHERE id = $2`, [cat.id, rp.id]);
           }
        }
      }
    }

    console.log('DB Fixes Applied Successfully!');
  } catch(e) {
    console.log('Error applying DB fixes:', e.message);
  }
  await client.end();
}

run().catch(console.error);
