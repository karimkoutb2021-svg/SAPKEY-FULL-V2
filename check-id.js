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
  const res = await client.query("SELECT * FROM products WHERE id = 'c7d945e0-d396-444a-89e0-5fcbc83a3df1'");
  console.log(res.rows[0]);
  await client.end();
}
go();
