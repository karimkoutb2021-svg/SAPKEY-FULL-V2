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
  const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
  const tables = res.rows.map(r => r.table_name);
  console.log('Tables:', tables.filter(t => ['expenses', 'suppliers', 'accounting_entries', 'journal_entries'].includes(t)));
  await client.end();
}
go();
