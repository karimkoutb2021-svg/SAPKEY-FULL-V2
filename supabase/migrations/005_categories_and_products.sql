-- ============================================
-- Categories & Product Enhancements
-- ============================================

-- ============================================
-- PRODUCT CATEGORIES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ar VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    slug VARCHAR(255) UNIQUE,
    description TEXT,
    image_url TEXT,
    parent_id UUID REFERENCES product_categories(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_categories_slug ON product_categories(slug);
CREATE INDEX idx_product_categories_parent ON product_categories(parent_id);
CREATE INDEX idx_product_categories_active ON product_categories(is_active);

-- ============================================
-- EXTEND PRODUCTS TABLE
-- ============================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 15;
ALTER TABLE products ADD COLUMN IF NOT EXISTS images TEXT[];
ALTER TABLE products ADD COLUMN IF NOT EXISTS max_stock DECIMAL(15,3) DEFAULT 1000;
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_expiry BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE products ADD COLUMN IF NOT EXISTS wholesale_price DECIMAL(15,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Add foreign key constraint for category_id if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'products_category_id_fkey'
    ) THEN
        ALTER TABLE products ADD CONSTRAINT products_category_id_fkey
        FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================
-- STOREFRONT BANNERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS storefront_banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_ar VARCHAR(255) NOT NULL,
    title_en VARCHAR(255),
    subtitle_ar TEXT,
    subtitle_en TEXT,
    image_url TEXT NOT NULL,
    link_url TEXT,
    link_type VARCHAR(50) DEFAULT 'product',
    target_id UUID,
    position VARCHAR(50) DEFAULT 'hero',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_storefront_banners_position ON storefront_banners(position);
CREATE INDEX idx_storefront_banners_active ON storefront_banners(is_active);
CREATE INDEX idx_storefront_banners_dates ON storefront_banners(start_date, end_date);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_product_categories_updated_at
    BEFORE UPDATE ON product_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_storefront_banners_updated_at
    BEFORE UPDATE ON storefront_banners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE storefront_banners ENABLE ROW LEVEL SECURITY;

-- Public can view active banners
CREATE POLICY "Anyone can view active banners"
    ON storefront_banners FOR SELECT
    USING (true);

-- Authenticated users can manage banners
CREATE POLICY "Authenticated users can manage banners"
    ON storefront_banners FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ============================================
-- SEED CATEGORIES
-- ============================================

INSERT INTO product_categories (name_ar, name_en, slug, sort_order, is_active) VALUES
    ('ألبان وأجبان', 'Dairy & Cheese', 'dairy', 1, true),
    ('مشروبات', 'Beverages', 'beverages', 2, true),
    ('وجبات خفيفة', 'Snacks', 'snacks', 3, true),
    ('مواد معلبة', 'Canned Goods', 'canned', 4, true),
    ('مجمدات', 'Frozen Foods', 'frozen', 5, true),
    ('مخبوزات', 'Bakery', 'bakery', 6, true),
    ('منظفات', 'Cleaning Supplies', 'cleaning', 7, true),
    ('عناية شخصية', 'Personal Care', 'personal', 8, true),
    ('توابل وبهارات', 'Spices & Herbs', 'spices', 9, true),
    ('زيوت وسمن', 'Oils & Ghee', 'oils', 10, true),
    ('مكرونة وأرز', 'Pasta & Rice', 'pasta', 11, true),
    ('حلويات وشوكولاتة', 'Sweets & Chocolate', 'sweets', 12, true)
ON CONFLICT (slug) DO NOTHING;
