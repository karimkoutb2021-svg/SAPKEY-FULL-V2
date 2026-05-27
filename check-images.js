const { Client } = require('pg');

const client = new Client({
  host: 'aws-0-eu-west-1.pooler.supabase.com',
  port: 6543,
  user: 'postgres.fpcpqgpbznbsmeqqxmhx',
  password: 'Msbchz@12345@',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function checkMissingImages() {
  try {
    await client.connect();
    const res = await client.query("SELECT id, name_ar, image_url FROM products");
    console.log(`Total products: ${res.rows.length}`);
    const missing = res.rows.filter(p => !p.image_url || p.image_url === '/product-placeholder.svg');
    console.log(`Missing images: ${missing.length}`);
    if (missing.length > 0) {
      console.log('Sample missing:');
      console.log(missing.slice(0, 5).map(m => m.name_ar));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkMissingImages();
