const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, '..', 'backup-data');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const TABLE_FOLDER_MAP = {
  products: 'products',
  product_categories: 'categories',
  categories: 'categories',
  banners: 'banners',
  users: 'avatars',
  suppliers: 'suppliers',
  customers: 'customers',
  branding_settings: 'branding',
};

const IMAGE_COLUMN_PATTERNS = [
  'image_url', 'images', 'image', 'img_url', 'icon', 'icon_url',
  'avatar_url', 'avatar', 'logo_url', 'logo',
  'banner_url', 'banner', 'photo_url', 'photo',
  'thumbnail_url', 'thumbnail', 'file_url', 'attachment_urls',
  'category_image', 'background_image', 'cover_image',
];

function findImageColumns(obj) {
  if (!obj || typeof obj !== 'object') return [];
  return Object.keys(obj).filter(k =>
    typeof obj[k] === 'string' &&
    obj[k].length > 0 &&
    !obj[k].startsWith('http') &&
    !obj[k].startsWith('data:') &&
    !k.startsWith('_')
  ).filter(k => {
    const kl = k.toLowerCase();
    return IMAGE_COLUMN_PATTERNS.some(p => kl.includes(p));
  });
}

function findLocalFiles(obj) {
  const files = new Set();
  for (const [col, val] of Object.entries(obj)) {
    if (typeof val === 'string' && (val.startsWith('/') || val.startsWith('public/'))) {
      const clean = val.replace(/^public\//, '');
      if (val.includes('.') && !val.startsWith('http') && !val.startsWith('data:')) {
        files.add(clean);
      }
    }
    if (Array.isArray(val)) {
      for (const item of val) {
        if (typeof item === 'string' && item.startsWith('/')) {
          const c = item.replace(/^public\//, '');
          if (item.includes('.') && !item.startsWith('http') && !item.startsWith('data:')) {
            files.add(c);
          }
        }
      }
    }
  }
  return files;
}

function resolveFilePath(relativePath) {
  const candidates = [
    path.join(PUBLIC_DIR, relativePath.replace(/^\//, '')),
    path.join(__dirname, '..', relativePath.replace(/^\//, '')),
    relativePath,
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  const basename = path.basename(relativePath);
  const inPublic = path.join(PUBLIC_DIR, basename);
  if (fs.existsSync(inPublic)) return inPublic;
  const imagesCat = path.join(PUBLIC_DIR, 'images', 'categories', basename);
  if (fs.existsSync(imagesCat)) return imagesCat;
  const catDir = path.join(PUBLIC_DIR, 'categories', basename);
  if (fs.existsSync(catDir)) return catDir;
  const prodDir = path.join(PUBLIC_DIR, 'products', basename);
  if (fs.existsSync(prodDir)) return prodDir;
  return null;
}

async function uploadFile(filePath, folder, publicId) {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      public_id: publicId,
      overwrite: false,
      resource_type: 'image',
    });
    return result.secure_url;
  } catch (err) {
    if (err.message && err.message.includes('already exists')) {
      const existing = await cloudinary.api.resource(`${folder}/${publicId}`);
      return existing.secure_url;
    }
    throw err;
  }
}

async function run() {
  const allBackupFiles = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json') && f !== 'manifest.json' && f !== 'schema-scan-report.json' && f !== 'migration-report.json');

  console.log('=== SCANNING ALL BACKUP FILES FOR IMAGES ===\n');

  const allImagePaths = new Map(); // relativePath -> { tables: [], count: 0 }
  const tableImageColumns = {};   // table -> { rows: [], columns: [] }

  for (const file of allBackupFiles) {
    const tableName = file.replace('.json', '');
    const data = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, file), 'utf8'));
    if (!Array.isArray(data) || data.length === 0) {
      console.log(`⏭️  ${tableName}: empty`);
      continue;
    }

    const columns = findImageColumns(data[0]);
    if (columns.length === 0) {
      console.log(`⏭️  ${tableName}: no image columns`);
      continue;
    }

    console.log(`📋 ${tableName}: ${data.length} rows, columns: ${columns.join(', ')}`);

    tableImageColumns[tableName] = { rows: data.length, columns };

    for (const row of data) {
      const files = findLocalFiles(row);
      for (const f of files) {
        if (!allImagePaths.has(f)) {
          allImagePaths.set(f, { tables: new Set(), count: 0 });
        }
        allImagePaths.get(f).tables.add(tableName);
        allImagePaths.get(f).count++;
      }
    }
  }

  console.log(`\n=== FOUND ${allImagePaths.size} UNIQUE IMAGE PATH(S) ===\n`);

  let uploaded = 0;
  let failed = 0;
  let skipped = 0;
  const pathToCloudinary = new Map(); // old path -> cloudinary URL

  for (const [relativePath, info] of allImagePaths) {
    const filePath = resolveFilePath(relativePath);
    if (!filePath) {
      console.log(`❌ File not found on disk: ${relativePath} (referenced by ${info.count} rows in ${[...info.tables].join(', ')})`);
      failed++;
      continue;
    }

    const tableName = [...info.tables][0];
    const folder = TABLE_FOLDER_MAP[tableName] || 'misc';
    const ext = path.extname(relativePath).replace('.', '');
    const publicId = path.basename(relativePath, `.${ext}`)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 100);

    try {
      const url = await uploadFile(filePath, folder, publicId);
      pathToCloudinary.set(relativePath, url);
      uploaded++;
      console.log(`✅ [${folder}/${publicId}] ${relativePath} → ${url}`);
    } catch (err) {
      console.error(`❌ Upload failed: ${relativePath} - ${err.message}`);
      failed++;
    }
  }

  console.log(`\n=== UPLOAD SUMMARY ===`);
  console.log(`   Uploaded: ${uploaded}`);
  console.log(`   Failed:   ${failed}`);
  console.log(`   Skipped:  ${skipped}`);

  // === STEP 2: UPDATE ALL BACKUP JSON FILES ===
  console.log(`\n=== UPDATING BACKUP JSON FILES WITH CLOUDINARY URLs ===\n`);

  let updatedTables = 0;
  let totalUpdatedRows = 0;

  for (const file of allBackupFiles) {
    const tableName = file.replace('.json', '');
    const filePath = path.join(BACKUP_DIR, file);
    let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!Array.isArray(data) || data.length === 0) continue;

    const columns = tableImageColumns[tableName]?.columns || [];
    if (columns.length === 0) continue;

    let tableUpdated = 0;
    for (const row of data) {
      let rowUpdated = false;
      for (const col of columns) {
        if (typeof row[col] === 'string' && row[col].startsWith('/')) {
          const newUrl = pathToCloudinary.get(row[col]);
          if (newUrl) {
            row[col] = newUrl;
            rowUpdated = true;
          }
        }
        if (Array.isArray(row[col])) {
          const newArr = row[col].map(v => {
            if (typeof v === 'string' && v.startsWith('/')) {
              return pathToCloudinary.get(v) || v;
            }
            return v;
          });
          if (JSON.stringify(newArr) !== JSON.stringify(row[col])) {
            row[col] = newArr;
            rowUpdated = true;
          }
        }
      }
      if (rowUpdated) tableUpdated++;
    }

    if (tableUpdated > 0) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      updatedTables++;
      totalUpdatedRows += tableUpdated;
      console.log(`✅ ${tableName}: updated ${tableUpdated} rows`);
    } else {
      console.log(`⏭️  ${tableName}: no changes`);
    }
  }

  console.log(`\n=== BACKUP UPDATE SUMMARY ===`);
  console.log(`   Tables updated: ${updatedTables}`);
  console.log(`   Rows updated:   ${totalUpdatedRows}`);

  // === STEP 3: GENERATE MAPPING FILE ===
  const mapping = {};
  for (const [oldPath, cloudUrl] of pathToCloudinary) {
    mapping[oldPath] = cloudUrl;
  }
  const mappingPath = path.join(BACKUP_DIR, 'cloudinary-mapping.json');
  fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2), 'utf8');
  console.log(`\n✅ Mapping file saved: ${mappingPath}`);

  // === STEP 4: GENERATE SQL CLEANUP SCRIPT ===
  console.log(`\n=== GENERATING SQL CLEANUP ===\n`);

  const sqlLines = [
    '-- ============================================================',
    '-- SQL CLEANUP: Clear old heavy image columns after Cloudinary verification',
    '-- EXECUTE ONLY after confirming ALL images are visible in Cloudinary',
    '-- ============================================================',
    '',
    'BEGIN;',
    '',
  ];

  for (const [tableName, info] of Object.entries(tableImageColumns)) {
    if (info.rows === 0) continue;
    for (const col of info.columns) {
      sqlLines.push(`-- ${tableName}.${col}: ${info.rows} rows`);
      sqlLines.push(`UPDATE "${tableName}" SET "${col}" = NULL`);
      sqlLines.push(`WHERE "${col}" IS NOT NULL AND "${col}" != '';`);
      sqlLines.push('');
    }
  }

  sqlLines.push('COMMIT;');
  sqlLines.push('');
  sqlLines.push('-- Verify no remaining old paths:');
  sqlLines.push("SELECT table_name, column_name FROM information_schema.columns WHERE column_name ILIKE '%image%' OR column_name ILIKE '%img%' OR column_name ILIKE '%icon%' OR column_name ILIKE '%avatar%' OR column_name ILIKE '%banner%' OR column_name ILIKE '%photo%';");

  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '999_cleanup_local_images.sql');
  fs.writeFileSync(sqlPath, sqlLines.join('\n'), 'utf8');
  console.log(`✅ SQL cleanup script saved: ${sqlPath}`);
  console.log('');

  // Final summary
  console.log('=== FINAL SYSTEM-WIDE REPORT ===');
  console.log(`Tables with image columns: ${Object.keys(tableImageColumns).length}`);
  for (const [t, info] of Object.entries(tableImageColumns)) {
    console.log(`   ${t}: ${info.rows} rows, ${info.columns.join(', ')}`);
  }
  console.log(`\nUnique local files uploaded to Cloudinary: ${uploaded}`);
  console.log(`Failed uploads: ${failed}`);
  console.log(`Cloudinary mapping entries: ${pathToCloudinary.size}`);
  console.log(`Backup rows updated: ${totalUpdatedRows}`);
  console.log(`SQL cleanup generated: supabase/migrations/999_cleanup_local_images.sql`);
  console.log('\nDone!');
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
