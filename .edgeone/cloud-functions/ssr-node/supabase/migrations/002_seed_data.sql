-- ============================================
-- Seed Data for ERP System
-- ============================================

-- ============================================
-- BRANCHES
-- ============================================

INSERT INTO branches (name_ar, name_en, code, address, phone, is_main) VALUES
('المركز الرئيسي', 'Main Branch', 'MAIN', 'القاهرة، شارع العليا', '0112345678', true),
('فرع الشمال', 'North Branch', 'NORTH', 'القاهرة، شمال المدينة', '0112345679', false),
('فرع الجنوب', 'South Branch', 'SOUTH', 'القاهرة، جنوب المدينة', '0112345680', false);

-- ============================================
-- WAREHOUSES
-- ============================================

INSERT INTO warehouses (name_ar, name_en, code, address, is_main) VALUES
('المستودع الرئيسي', 'Main Warehouse', 'WH001', 'القاهرة، المنطقة الصناعية', true),
('مستودع الشمال', 'North Warehouse', 'WH002', 'القاهرة، شمال المدينة', false),
('مستودع الجنوب', 'South Warehouse', 'WH003', 'القاهرة، جنوب المدينة', false);

-- ============================================
-- SUPPLIER CATEGORIES
-- ============================================

INSERT INTO supplier_categories (name_ar, name_en, code, description) VALUES
('مواد غذائية', 'Food Products', 'FOOD', 'جميع المواد الغذائية'),
('ألبان ومنتجات الألبان', 'Dairy Products', 'DAIRY', 'الألبان والجبن والزبادي'),
('مشروبات', 'Beverages', 'BEV', 'المشروبات الغازية والعصائر'),
('مستلزمات تنظيف', 'Cleaning Supplies', 'CLEAN', 'المنظفات ومعطرات'),
('أدوات مكتبية', 'Office Supplies', 'OFFICE', 'الأدوات المكتبية'),
('فواكه وخضروات', 'Fruits & Vegetables', 'FRUIT', 'الفواكه والخضروات الطازجة'),
('لحوم ودواجن', 'Meat & Poultry', 'MEAT', 'اللحوم والدواجن'),
('مخبوزات', 'Bakery', 'BAKERY', 'الخبز والمعجنات');

-- ============================================
-- SUPPLIERS
-- ============================================

INSERT INTO suppliers (code, name_ar, name_en, category_id, contact_person, phone, email, address, city, tax_number, commercial_registration, opening_balance, credit_limit, payment_terms, status, rating) VALUES
('SUP001', 'شركة الأغذية المتحدة', 'United Food Company', (SELECT id FROM supplier_categories WHERE code = 'FOOD'), 'أحمد محمد', '0123456789', 'info@foodco.com', 'القاهرة، الصناعية', 'القاهرة', '300012345678901', '1010123456', 50000, 100000, 30, 'active', 5),
('SUP002', 'مصنع الألبان الحديث', 'Modern Dairy Factory', (SELECT id FROM supplier_categories WHERE code = 'DAIRY'), 'خالد العمري', '0112345678', 'sales@dairy.com', 'الإسكندرية، المنطقة الصناعية', 'الإسكندرية', '300012345678902', '1010123457', 30000, 75000, 45, 'active', 4),
('SUP003', 'شركة المشروبات الوطنية', 'National Beverages Co', (SELECT id FROM supplier_categories WHERE code = 'BEV'), 'سعيد الردادي', '0113456789', 'info@nbeve.com', 'بورسعيد، الصناعية', 'بورسعيد', '300012345678903', '1010123458', 20000, 50000, 30, 'active', 4),
('SUP004', 'مؤسسة清洁 للتظيف', 'Clean Cleaning Est', (SELECT id FROM supplier_categories WHERE code = 'CLEAN'), 'محمد الشمري', '0114567890', 'clean@est.com', 'القاهرة، شمال القاهرة', 'القاهرة', '300012345678904', '1010123459', 10000, 25000, 30, 'active', 3),
('SUP005', 'مكتبة الشرق الأدنى', 'Near East Library', (SELECT id FROM supplier_categories WHERE code = 'OFFICE'), 'علي الحمد', '0115678901', 'sales@neoffice.com', 'القاهرة، العليا', 'القاهرة', '300012345678905', '1010123460', 5000, 15000, 30, 'active', 5);

-- ============================================
-- PRODUCTS
-- ============================================

INSERT INTO products (sku, barcode, name_ar, name_en, category_id, unit, unit_price, cost_price, sale_price, min_stock_level, current_stock) VALUES
('PROD001', '6291234567890', 'حليب طازج 1 لتر', 'Fresh Milk 1L', (SELECT id FROM supplier_categories WHERE code = 'DAIRY'), 'لتر', 5.50, 4.00, 7.00, 50, 200),
('PROD002', '6291234567891', 'زبادي طبيعي 500 مل', 'Natural Yogurt 500ml', (SELECT id FROM supplier_categories WHERE code = 'DAIRY'), 'قطعة', 4.00, 2.80, 5.50, 100, 300),
('PROD003', '6291234567892', 'جبن أبيض 500 جرام', 'White Cheese 500g', (SELECT id FROM supplier_categories WHERE code = 'DAIRY'), 'كيلو', 18.00, 14.00, 25.00, 30, 80),
('PROD004', '6291234567893', 'خبز عربي متوسط', 'Arabic Bread Medium', (SELECT id FROM supplier_categories WHERE code = 'BAKERY'), 'قطعة', 1.50, 1.00, 2.50, 200, 500),
('PROD005', '6291234567894', 'ماء معدني 1.5 لتر', 'Mineral Water 1.5L', (SELECT id FROM supplier_categories WHERE code = 'BEV'), 'قطعة', 2.00, 1.20, 3.00, 300, 800),
('PROD006', '6291234567895', 'عصير برتقال 1 لتر', 'Orange Juice 1L', (SELECT id FROM supplier_categories WHERE code = 'BEV'), 'قطعة', 6.00, 4.50, 8.50, 50, 150),
('PROD007', '6291234567896', 'مسحوق غسيل 3 كيلو', 'Detergent Powder 3kg', (SELECT id FROM supplier_categories WHERE code = 'CLEAN'), 'قطعة', 25.00, 20.00, 35.00, 20, 50),
('PROD008', '6291234567897', 'صابون سائل 1 لتر', 'Liquid Soap 1L', (SELECT id FROM supplier_categories WHERE code = 'CLEAN'), 'قطعة', 12.00, 9.00, 18.00, 30, 75);

-- ============================================
-- PERMISSIONS
-- ============================================

INSERT INTO permissions (name, name_ar, description, module) VALUES
('suppliers.view', 'عرض الموردين', 'View suppliers list', 'suppliers'),
('suppliers.create', 'إضافة مورد', 'Create new supplier', 'suppliers'),
('suppliers.edit', 'تعديل المورد', 'Edit supplier', 'suppliers'),
('suppliers.delete', 'حذف المورد', 'Delete supplier', 'suppliers'),
('invoices.view', 'عرض الفواتير', 'View purchase invoices', 'invoices'),
('invoices.create', 'إنشاء فاتورة', 'Create purchase invoice', 'invoices'),
('invoices.edit', 'تعديل الفاتورة', 'Edit purchase invoice', 'invoices'),
('invoices.approve', 'اعتماد الفاتورة', 'Approve purchase invoice', 'invoices'),
('invoices.delete', 'حذف الفاتورة', 'Delete purchase invoice', 'invoices'),
('payments.view', 'عرض المدفوعات', 'View payments', 'payments'),
('payments.create', 'إنشاء دفعة', 'Create payment', 'payments'),
('payments.approve', 'اعتماد الدفعة', 'Approve payment', 'payments'),
('reports.view', 'عرض التقارير', 'View reports', 'reports'),
('reports.export', 'تصدير التقارير', 'Export reports', 'reports'),
('inventory.view', 'عرض المخزون', 'View inventory', 'inventory'),
('inventory.adjust', 'تعديل المخزون', 'Adjust inventory', 'inventory'),
('users.manage', 'إدارة المستخدمين', 'Manage users', 'users'),
('settings.manage', 'إدارة الإعدادات', 'Manage settings', 'settings'),
('ocr.scan', 'مسح OCR', 'OCR scanning', 'ocr'),
('excel.import', 'استيراد Excel', 'Excel import', 'excel'),
('excel.export', 'تصدير Excel', 'Excel export', 'excel');

-- ============================================
-- ROLE PERMISSIONS
-- ============================================

-- Admin - all permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions;

-- Manager - most permissions except users.manage and settings.manage
INSERT INTO role_permissions (role, permission_id)
SELECT 'manager', id FROM permissions
WHERE name NOT IN ('users.manage', 'settings.manage');

-- Accountant - view and create payments/invoices
INSERT INTO role_permissions (role, permission_id)
SELECT 'accountant', id FROM permissions
WHERE name IN (
    'suppliers.view', 'suppliers.create', 'suppliers.edit',
    'invoices.view', 'invoices.create', 'invoices.edit',
    'payments.view', 'payments.create', 'payments.approve',
    'reports.view', 'reports.export'
);

-- Cashier - limited permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'cashier', id FROM permissions
WHERE name IN (
    'suppliers.view',
    'invoices.view', 'invoices.create',
    'payments.view', 'payments.create'
);

-- ============================================
-- DEFAULT USERS
-- ============================================

INSERT INTO users (email, password_hash, full_name_ar, full_name_en, phone, role, is_active) VALUES
('admin@erp.com', '$2a$10$abcdefghijklmnopqrstuv', 'أحمد المدير', 'Ahmed Al-Mudir', '0112345678', 'admin', true),
('manager@erp.com', '$2a$10$abcdefghijklmnopqrstuv', 'خالد المدير', 'Khalid Al-Mudir', '0112345679', 'manager', true),
('accountant@erp.com', '$2a$10$abcdefghijklmnopqrstuv', 'علي المحاسب', 'Ali Al-Muhasib', '0112345680', 'accountant', true),
('cashier@erp.com', '$2a$10$abcdefghijklmnopqrstuv', 'محمد الكاشير', 'Muhammad Al-Cashier', '0112345681', 'cashier', true);

-- ============================================
-- CHART OF ACCOUNTS
-- ============================================

INSERT INTO chart_of_accounts (code, name_ar, name_en, account_type, parent_code, is_system) VALUES
('1000', 'الأصول', 'Assets', 'asset', NULL, true),
('1100', 'الأصول المتداولة', 'Current Assets', 'asset', '1000', true),
('1110', 'النقدية', 'Cash', 'asset', '1100', true),
('1120', 'البنوك', 'Banks', 'asset', '1100', true),
('1130', 'العملاء', 'Accounts Receivable', 'asset', '1100', true),
('1200', 'الأصول الثابتة', 'Fixed Assets', 'asset', '1000', true),
('2000', 'الخصوم', 'Liabilities', 'liability', NULL, true),
('2100', 'الخصوم المتداولة', 'Current Liabilities', 'liability', '2000', true),
('2110', 'الموردين', 'Accounts Payable', 'liability', '2100', true),
('2120', 'الضرائب المستحقة', 'Tax Payable', 'liability', '2100', true),
('3000', 'حقوق الملكية', 'Equity', 'equity', NULL, true),
('3100', 'رأس المال', 'Capital', 'equity', '3000', true),
('3200', 'الأرباح المحتجزة', 'Retained Earnings', 'equity', '3000', true),
('4000', 'الإيرادات', 'Revenue', 'revenue', NULL, true),
('4100', 'إيرادات المبيعات', 'Sales Revenue', 'revenue', '4000', true),
('5000', 'المصروفات', 'Expenses', 'expense', NULL, true),
('5100', 'تكلفة البضاعة المباعة', 'Cost of Goods Sold', 'expense', '5000', true),
('5200', 'المصروفات التشغيلية', 'Operating Expenses', 'expense', '5000', true);