/**
 * One-time Image Migration — SAPKEY → Cloudinary
 *
 * BACKGROUND:
 *   - 456 products total in backup
 *   - 0 products with Base64 data (that pattern was never used in this app)
 *   - 8 products had old Supabase Storage URLs → ALL unreachable (project deactivated)
 *   - 448 products have local relative paths (/products/xxx.png) or empty
 *
 * WHAT THIS SCRIPT DOES:
 *   1. Tries to fetch each old Supabase Storage URL
 *   2. If reachable → uploads to Cloudinary, updates backup with Cloudinary URL
 *   3. If unreachable → sets to /product-placeholder.svg (in public/)
 *   4. Local paths kept as-is (they're in the repo's public/ directory)
 *
 * USAGE:  node scripts/migrate-images-to-cloudinary.js
 * VERIFY: cat backup-data/migration-report.json
 */

const fs = require('fs');
const path = require('path');

const CLOUD_NAME = 'dhv9lgmys';
const UPLOAD_PRESET = 'rpytrgb6';
const PLACEHOLDER = '/product-placeholder.svg';

const report = { products: { total: 0, migrated: 0, fallback_placeholder: 0, skipped: 0, details: [] } };

async function isUrlReachable(url) {
  try {
    const resp = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return false;
    const ct = resp.headers.get('content-type') || '';
    return ct.startsWith('image/');
  } catch {
    return false;
  }
}

async function uploadToCloudinary(url, folder) {
  const resp = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!resp.ok) throw new Error(`Source fetch failed: ${resp.status}`);
  const blob = await resp.blob();
  const formData = new FormData();
  formData.append('file', blob, `${folder}_${Date.now()}.jpg`);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST', body: formData,
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()).secure_url;
}

async function migrateProducts() {
  const filePath = path.join(__dirname, '..', 'backup-data', 'products.json');
  if (!fs.existsSync(filePath)) { console.log('backup-data/products.json not found'); return; }

  const products = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  report.products.total = products.length;
  console.log(`\n📦 Products: ${products.length}`);

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const oldUrl = (p.image_url || '').trim();
    const label = `${i + 1}/${products.length} ${p.name_ar || 'N/A'} (${p.sku || '—'})`;

    if (!oldUrl || oldUrl === PLACEHOLDER) {
      report.products.details.push({ id: p.id, sku: p.sku, action: 'skipped-empty' });
      continue;
    }
    if (oldUrl.includes('cloudinary.com')) {
      report.products.details.push({ id: p.id, sku: p.sku, action: 'skipped-already-cloudinary' });
      continue;
    }
    if (oldUrl.startsWith('/')) {
      report.products.details.push({ id: p.id, sku: p.sku, action: 'skipped-local-path', url: oldUrl });
      continue;
    }

    // External URL — check if reachable
    const reachable = await isUrlReachable(oldUrl);
    if (!reachable) {
      p.image_url = PLACEHOLDER;
      report.products.details.push({ id: p.id, sku: p.sku, action: 'fallback-placeholder', reason: 'source_unreachable' });
      report.products.fallback_placeholder++;
      console.log(`  ${label}: ❌ Source unreachable → ${PLACEHOLDER}`);
      continue;
    }

    process.stdout.write(`  ${label}: ☁️ uploading... `);
    try {
      const newUrl = await uploadToCloudinary(oldUrl, 'products');
      p.image_url = newUrl;
      report.products.details.push({ id: p.id, sku: p.sku, action: 'migrated', new_url: newUrl });
      report.products.migrated++;
      console.log(`✅`);
    } catch (err) {
      p.image_url = PLACEHOLDER;
      report.products.details.push({ id: p.id, sku: p.sku, action: 'fallback-placeholder', reason: err.message.substring(0, 80) });
      report.products.fallback_placeholder++;
      console.log(`❌ ${err.message.substring(0, 50)} → ${PLACEHOLDER}`);
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(products, null, 2));

  const summary = report.products;
  const withImages = products.filter(p => p.image_url && p.image_url !== PLACEHOLDER && !p.image_url.startsWith('/'));
  const withPlaceholder = products.filter(p => p.image_url && p.image_url.startsWith('/'));
  const empty = products.filter(p => !p.image_url);

  console.log(`\n  ☁️  Cloudinary URLs: ${withImages.length}`);
  console.log(`  🖼️  Local paths:     ${withPlaceholder.length}`);
  console.log(`  🔲 Empty:           ${empty.length}`);
}

async function main() {
  console.log('══════════════════════════════════════════════');
  console.log('   SAPKEY — Cloudinary Image Migration');
  console.log(`   Cloud: ${CLOUD_NAME}`);
  console.log('══════════════════════════════════════════════');
  await migrateProducts();
  fs.writeFileSync(path.join(__dirname, '..', 'backup-data', 'migration-report.json'), JSON.stringify(report, null, 2));
  console.log('\n══════════════════════════════════════════════');
  console.log('   MIGRATION COMPLETE — Report saved');
  console.log('══════════════════════════════════════════════');
  console.log(`   Total:    ${report.products.total}`);
  console.log(`   ☁️ Migrated: ${report.products.migrated}`);
  console.log(`   🖼️ Fallback: ${report.products.fallback_placeholder}`);
  console.log(`   ⏭️ Skipped:  ${report.products.skipped}`);
  console.log('\n   backup-data/migration-report.json');
  console.log('   backup-data/products.json (updated)');
}

main().catch(console.error);
