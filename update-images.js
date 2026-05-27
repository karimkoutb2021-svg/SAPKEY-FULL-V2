const { Client } = require('pg');

const client = new Client({
  host: 'aws-0-eu-west-1.pooler.supabase.com',
  port: 6543,
  user: 'postgres.fpcpqgpbznbsmeqqxmhx',
  password: 'Msbchz@12345@',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function updateImages() {
  try {
    await client.connect();
    
    // Update products
    await client.query("UPDATE products SET image_url = '/mineral_water.png' WHERE name_ar = 'مياه معدنية 1.5 لتر' OR name_ar = 'مياه معدنية 600 مل'");
    await client.query("UPDATE products SET image_url = '/basmati_rice.png' WHERE name_ar LIKE '%أرز بسمتي%'");
    await client.query("UPDATE products SET image_url = '/cooking_oil.png' WHERE name_ar LIKE '%زيت طعام%'");
    await client.query("UPDATE products SET image_url = '/fresh_milk.png' WHERE name_ar LIKE '%حليب طازج%' OR name_ar LIKE '%حليب قليل الدسم%'");
    
    console.log("Images updated successfully in database.");
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

updateImages();
