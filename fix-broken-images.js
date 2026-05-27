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
  const res = await client.query("UPDATE products SET image_url = null WHERE image_url LIKE '/product_%' OR image_url = '/mineral_water.png' OR image_url = '/fresh_milk.png'");
  console.log('Fixed broken images:', res.rowCount);
  await client.end();
}
go();
