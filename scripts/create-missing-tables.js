const https = require('https');
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF;

const SQL = `
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  slug VARCHAR(255),
  description TEXT,
  image_url TEXT,
  parent_id UUID,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  slug VARCHAR(255),
  description TEXT,
  image_url TEXT,
  parent_id UUID,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255),
  subtitle VARCHAR(255),
  image_url TEXT,
  link_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all product_categories" ON product_categories;
CREATE POLICY "Allow all product_categories" ON product_categories FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all categories" ON categories;
CREATE POLICY "Allow all categories" ON categories FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all banners" ON banners;
CREATE POLICY "Allow all banners" ON banners FOR ALL USING (true) WITH CHECK (true);
`;

function query(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const req = https.request({
      hostname: 'api.supabase.com',
      path: '/v1/projects/' + REF + '/database/query',
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 30000,
    }, (res) => { let d=''; res.on('data', c => d+=c); res.on('end', () => { if (res.statusCode < 400) resolve(d); else reject(new Error(d.substring(0,200))); }); });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

query(SQL).then(() => console.log('✅ Missing tables created')).catch(e => console.error('❌', e.message));
