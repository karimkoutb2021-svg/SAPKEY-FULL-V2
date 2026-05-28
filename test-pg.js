const { Client } = require('pg');
const password = encodeURIComponent('Msbchz@12345@');
const connectionString = `postgresql://postgres:${password}@db.fpcpqgpbznbsmeqqxmhx.supabase.co:5432/postgres`;

async function test() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to Postgres successfully!');
    const res = await client.query('SELECT NOW()');
    console.log('Time:', res.rows[0]);
    await client.end();
  } catch(e) {
    console.error('Connection failed:', e.message);
  }
}
test();
