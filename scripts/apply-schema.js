const https = require('https');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const SQL_FILE = path.join(__dirname, '..', 'supabase', 'migrations', '000_master_migration.sql');

function querySupabase(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const req = https.request({
      hostname: 'api.supabase.com',
      path: '/v1/projects/' + PROJECT_REF + '/database/query',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + TOKEN,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 60000,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, data });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 500)}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body);
    req.end();
  });
}

function splitSQL(sql) {
  const statements = [];
  let current = '';
  let inDollar = null;
  let inString = false;
  let stringChar = null;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const peek = sql.substring(i, i + 2);

    // Dollar-quoting
    if (!inString && ch === '$') {
      if (inDollar === null) {
        const start = i;
        let end = i + 1;
        while (end < sql.length && sql[end] !== '$') end++;
        if (end < sql.length) {
          inDollar = sql.substring(start, end + 1);
          i = end;
          current += inDollar;
          continue;
        }
      } else if (peek === inDollar) {
        current += inDollar;
        i += inDollar.length - 1;
        inDollar = null;
        continue;
      }
    }

    // String literals
    if (inDollar === null) {
      if (!inString && (ch === "'" || ch === '"')) {
        inString = true;
        stringChar = ch;
      } else if (inString && ch === stringChar) {
        inString = false;
        stringChar = null;
      } else if (inString && ch === '\\') {
        current += ch;
        i++;
      }
    }

    // Statement separator
    if (ch === ';' && !inString && inDollar === null) {
      const trimmed = (current + ';').trim();
      if (trimmed.length > 1) statements.push(trimmed);
      current = '';
      continue;
    }

    current += ch;
  }

  const trimmed = current.trim();
  if (trimmed.length > 1) statements.push(trimmed);
  return statements;
}

function getStatementType(stmt) {
  const upper = stmt.trim().toUpperCase();
  if (upper.startsWith('CREATE EXTENSION')) return 'extension';
  if (upper.startsWith('CREATE TYPE') || upper.startsWith('DO $$')) return 'type';
  if (upper.startsWith('CREATE TABLE')) return 'table';
  if (upper.startsWith('ALTER TABLE')) return 'alter';
  if (upper.startsWith('CREATE INDEX')) return 'index';
  if (upper.startsWith('DROP INDEX')) return 'index';
  if (upper.startsWith('CREATE OR REPLACE FUNCTION') || upper.startsWith('CREATE FUNCTION')) return 'function';
  if (upper.startsWith('CREATE TRIGGER') || upper.startsWith('DROP TRIGGER')) return 'trigger';
  if (upper.startsWith('CREATE POLICY') || upper.startsWith('DROP POLICY')) return 'policy';
  if (upper.startsWith('ALTER PUBLICATION')) return 'publication';
  if (upper.startsWith('INSERT INTO') || upper.startsWith('SELECT')) return 'data';
  if (upper.startsWith('ALTER TABLE') && upper.includes('ENABLE ROW LEVEL SECURITY')) return 'rls';
  return 'other';
}

async function main() {
  console.log('=== APPLYING MASTER MIGRATION TO NEW SUPABASE ===\n');

  const sql = fs.readFileSync(SQL_FILE, 'utf8');
  const statements = splitSQL(sql);
  console.log(`Total statements: ${statements.length}\n`);

  // Remove duplicate CREATE TYPE statements for types that already exist from other parts
  const seenTypes = new Set();
  const filtered = [];
  for (const stmt of statements) {
    const type = getStatementType(stmt);
    if (type === 'type' && stmt.includes('CREATE TYPE')) {
      const match = stmt.match(/CREATE\s+TYPE\s+(\w+)/i);
      if (match) {
        if (seenTypes.has(match[1])) continue;
        seenTypes.add(match[1]);
      }
    }
    filtered.push(stmt);
  }
  console.log(`After dedup: ${filtered.length} statements\n`);

  // Group into batches
  const batches = [];
  let currentBatch = '';
  let batchCount = 0;

  for (const stmt of filtered) {
    const candidate = currentBatch ? currentBatch + '\n\n' + stmt : stmt;
    if (candidate.length > 100000) {
      batches.push(currentBatch);
      currentBatch = stmt;
      batchCount++;
    } else {
      currentBatch = candidate;
    }
  }
  if (currentBatch.trim()) batches.push(currentBatch);
  batchCount = batches.length;

  console.log(`Sending ${batchCount} batch(es) to Management API...\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const batchSizeKB = (Buffer.byteLength(batch) / 1024).toFixed(1);
    process.stdout.write(`  Batch ${i + 1}/${batchCount} (${batchSizeKB} KB)... `);

    try {
      // Extract first few statements for logging
      const firstStmt = batch.trim().split('\n')[0].substring(0, 60);
      console.log(`[${firstStmt}...]`);

      const result = await querySupabase(batch);
      successCount++;
      process.stdout.write(`    ✅ OK\n`);
    } catch (err) {
      failCount++;
      console.log(`    ❌ ${err.message.substring(0, 200)}`);

      // If batch fails, try individual statements
      console.log(`       → Retrying as individual statements...`);
      const individualStatements = batch.split(';\n').filter(s => s.trim());
      for (const stmt of individualStatements) {
        const trimmed = stmt.trim();
        if (!trimmed) continue;
        try {
          await querySupabase(trimmed + ';');
          process.stdout.write(`    ✅ ${trimmed.substring(0, 50)}...\n`);
        } catch (e2) {
          process.stdout.write(`    ⚠️  ${trimmed.substring(0, 50)}... → ${e2.message.substring(0, 100)}\n`);
        }
      }
    }
  }

  console.log(`\n=== BATCH SUMMARY ===`);
  console.log(`  Success: ${successCount}/${batchCount}`);
  console.log(`  Failed:  ${failCount}/${batchCount}`);

  // Verify
  console.log(`\n=== VERIFYING TABLES ===`);
  try {
    const result = await querySupabase(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    const tables = JSON.parse(result.data);
    console.log('  Tables created:', tables.length);
    for (const t of tables) {
      const { data: countData } = JSON.parse((await querySupabase(`SELECT COUNT(*) as cnt FROM "${t.table_name}"`)).data);
      console.log(`  ✅ ${t.table_name}: ${countData[0]?.cnt || 0} rows (from seed data)`);
    }
  } catch (e) {
    console.error('  Verify error:', e.message);
  }
}

main().catch(console.error);
