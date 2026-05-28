const fs = require('fs');
const { Client } = require('pg');

const content = fs.readFileSync('src/app/api/setup/route.ts', 'utf8');
const startIndex = content.indexOf('const SQL = `');
if (startIndex === -1) throw new Error('SQL not found');
const sqlStart = content.indexOf('`', startIndex) + 1;
const sqlEnd = content.indexOf('`;', sqlStart);
const sql = content.substring(sqlStart, sqlEnd);

console.log('SQL Extracted length:', sql.length);

async function setupDB() {
  const pass = encodeURIComponent('Msbchz@12345@');
  const connStr = 'postgresql://postgres.fpcpqgpbznbsmeqqxmhx:' + pass + '@aws-0-eu-west-1.pooler.supabase.com:6543/postgres';
  const client = new Client({ connectionString: connStr, connectionTimeoutMillis: 10000 });
  
  try {
    await client.connect();
    console.log('Connected to DB');
    
    await client.query(sql);
    console.log('All tables created successfully!');
    
  } catch(e) {
    console.error('Error:', e);
  } finally {
    await client.end();
  }
}

setupDB();
