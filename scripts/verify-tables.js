const https = require('https');
const body = JSON.stringify({ query: "SELECT table_name, (SELECT count(*) FROM information_schema.tables WHERE table_schema='public') as total FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name" });
const req = https.request({
  hostname: 'api.supabase.com', path: '/v1/projects/cshpnhzhzahnpvfflsgx/database/query', method: 'POST',
  headers: { 'Authorization': 'Bearer ' + process.env.SUPABASE_ACCESS_TOKEN, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
}, (res) => { let d=''; res.on('data', c => d+=c); res.on('end', () => { const tables = JSON.parse(d); console.log('Total tables:', tables[0]?.total || '?'); tables.forEach(t => console.log('  ' + t.table_name)); }); });
req.on('error', e => console.error(e));
req.write(body);
req.end();
