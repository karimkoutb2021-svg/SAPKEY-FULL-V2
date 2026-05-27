const { Client } = require('pg');

const client = new Client({
  host: 'aws-0-eu-west-1.pooler.supabase.com',
  port: 6543,
  user: 'postgres.fpcpqgpbznbsmeqqxmhx',
  password: 'Msbchz@12345@',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function go() {
  await client.connect();
  const res = await client.query("SELECT id, name_ar, image_url FROM products WHERE image_url IS NOT NULL AND image_url != '/product-placeholder.svg'");
  console.log('Products with images:', res.rows.length);
  res.rows.forEach(r => console.log(r.name_ar, r.image_url));
  await client.end();
}
go();
