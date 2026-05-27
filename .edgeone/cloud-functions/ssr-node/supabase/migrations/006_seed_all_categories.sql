-- ============================================
-- SEED PRODUCTS ACROSS ALL CATEGORIES
-- ============================================
-- Run this in Supabase SQL Editor to distribute products across all 12 categories

-- First, let's get the category IDs
DO $$
DECLARE
    dairy_id UUID;
    beverages_id UUID;
    snacks_id UUID;
    canned_id UUID;
    frozen_id UUID;
    bakery_id UUID;
    cleaning_id UUID;
    personal_id UUID;
    spices_id UUID;
    oils_id UUID;
    pasta_id UUID;
    sweets_id UUID;
BEGIN
    SELECT id INTO dairy_id FROM product_categories WHERE slug = 'dairy' LIMIT 1;
    SELECT id INTO beverages_id FROM product_categories WHERE slug = 'beverages' LIMIT 1;
    SELECT id INTO snacks_id FROM product_categories WHERE slug = 'snacks' LIMIT 1;
    SELECT id INTO canned_id FROM product_categories WHERE slug = 'canned' LIMIT 1;
    SELECT id INTO frozen_id FROM product_categories WHERE slug = 'frozen' LIMIT 1;
    SELECT id INTO bakery_id FROM product_categories WHERE slug = 'bakery' LIMIT 1;
    SELECT id INTO cleaning_id FROM product_categories WHERE slug = 'cleaning' LIMIT 1;
    SELECT id INTO personal_id FROM product_categories WHERE slug = 'personal' LIMIT 1;
    SELECT id INTO spices_id FROM product_categories WHERE slug = 'spices' LIMIT 1;
    SELECT id INTO oils_id FROM product_categories WHERE slug = 'oils' LIMIT 1;
    SELECT id INTO pasta_id FROM product_categories WHERE slug = 'pasta' LIMIT 1;
    SELECT id INTO sweets_id FROM product_categories WHERE slug = 'sweets' LIMIT 1;

    -- ============================================
    -- ألبان وأجبان (Dairy & Cheese) - 10 products
    -- ============================================
    INSERT INTO products (sku, name_ar, name_en, category_id, unit, unit_price, sale_price, cost_price, current_stock, is_active, tax_rate) VALUES
    ('DAIRY-001', 'حليب طازج كامل الدسم 1 لتر', 'Full Cream Milk 1L', dairy_id, 'لتر', 6.00, 5.50, 4.00, 200, true, 15),
    ('DAIRY-002', 'حليب قليل الدسم 1 لتر', 'Low Fat Milk 1L', dairy_id, 'لتر', 6.50, 6.00, 4.50, 150, true, 15),
    ('DAIRY-003', 'زبادي طبيعي 500 مل', 'Natural Yogurt 500ml', dairy_id, 'عبوة', 6.00, 5.50, 4.00, 300, true, 15),
    ('DAIRY-004', 'زبادي فراولة 200 مل', 'Strawberry Yogurt 200ml', dairy_id, 'عبوة', 4.00, 3.50, 2.50, 250, true, 15),
    ('DAIRY-005', 'جبن أبيض 500 جرام', 'White Cheese 500g', dairy_id, 'عبوة', 30.00, 28.00, 20.00, 100, true, 15),
    ('DAIRY-006', 'جبن رومي 250 جرام', 'Rumi Cheese 250g', dairy_id, 'عبوة', 35.00, 32.00, 24.00, 80, true, 15),
    ('DAIRY-007', 'قشطة 200 جرام', 'Cream 200g', dairy_id, 'عبوة', 12.00, 11.00, 8.00, 120, true, 15),
    ('DAIRY-008', 'زبدة 200 جرام', 'Butter 200g', dairy_id, 'عبوة', 25.00, 23.00, 18.00, 90, true, 15),
    ('DAIRY-009', 'جبنة موزاريلا 250 جرام', 'Mozzarella Cheese 250g', dairy_id, 'عبوة', 28.00, 26.00, 20.00, 70, true, 15),
    ('DAIRY-010', 'لبنة 400 جرام', 'Labneh 400g', dairy_id, 'عبوة', 18.00, 16.00, 12.00, 110, true, 15);

    -- ============================================
    -- مشروبات (Beverages) - 10 products
    -- ============================================
    INSERT INTO products (sku, name_ar, name_en, category_id, unit, unit_price, sale_price, cost_price, current_stock, is_active, tax_rate) VALUES
    ('BEV-001', 'مياه معدنية 1.5 لتر', 'Mineral Water 1.5L', beverages_id, 'زجاجة', 3.00, 2.50, 1.50, 1000, true, 15),
    ('BEV-002', 'مياه معدنية 600 مل', 'Mineral Water 600ml', beverages_id, 'زجاجة', 2.00, 1.50, 1.00, 800, true, 15),
    ('BEV-003', 'عصير برتقال 1 لتر', 'Orange Juice 1L', beverages_id, 'عبوة', 12.00, 10.50, 8.00, 200, true, 15),
    ('BEV-004', 'عصير مانجو 1 لتر', 'Mango Juice 1L', beverages_id, 'عبوة', 14.00, 12.00, 9.00, 180, true, 15),
    ('BEV-005', 'بيبسي 330 مل', 'Pepsi 330ml', beverages_id, 'علبة', 5.00, 4.50, 3.50, 500, true, 15),
    ('BEV-006', 'كوكاكولا 330 مل', 'Coca-Cola 330ml', beverages_id, 'علبة', 5.00, 4.50, 3.50, 500, true, 15),
    ('BEV-007', 'سفن أب 330 مل', '7-Up 330ml', beverages_id, 'علبة', 5.00, 4.50, 3.50, 400, true, 15),
    ('BEV-008', 'شاي مثلج 330 مل', 'Iced Tea 330ml', beverages_id, 'علبة', 6.00, 5.50, 4.00, 300, true, 15),
    ('BEV-009', 'قهوة تركية 250 جرام', 'Turkish Coffee 250g', beverages_id, 'عبوة', 35.00, 32.00, 25.00, 150, true, 15),
    ('BEV-010', 'شاي أخضر 20 كيس', 'Green Tea 20 Bags', beverages_id, 'علبة', 18.00, 16.00, 12.00, 200, true, 15);

    -- ============================================
    -- وجبات خفيفة (Snacks) - 10 products
    -- ============================================
    INSERT INTO products (sku, name_ar, name_en, category_id, unit, unit_price, sale_price, cost_price, current_stock, is_active, tax_rate) VALUES
    ('SNACK-001', 'شيبسي ملح 150 جرام', 'Salt Chips 150g', snacks_id, 'كيس', 12.00, 10.00, 7.00, 300, true, 15),
    ('SNACK-002', 'شيبسي باربيكيو 150 جرام', 'BBQ Chips 150g', snacks_id, 'كيس', 12.00, 10.00, 7.00, 250, true, 15),
    ('SNACK-003', 'بسكويت شوكولاتة 200 جرام', 'Chocolate Biscuits 200g', snacks_id, 'علبة', 15.00, 13.00, 9.00, 200, true, 15),
    ('SNACK-004', 'فشار ميكروويف 100 جرام', 'Microwave Popcorn 100g', snacks_id, 'كيس', 8.00, 7.00, 5.00, 350, true, 15),
    ('SNACK-005', 'مكسرات مشكلة 200 جرام', 'Mixed Nuts 200g', snacks_id, 'كيس', 45.00, 40.00, 30.00, 100, true, 15),
    ('SNACK-006', 'زبيب 200 جرام', 'Raisins 200g', snacks_id, 'كيس', 20.00, 18.00, 14.00, 150, true, 15),
    ('SNACK-007', 'فول سوداني محمص 200 جرام', 'Roasted Peanuts 200g', snacks_id, 'كيس', 18.00, 16.00, 12.00, 180, true, 15),
    ('SNACK-008', 'بسكويت سادة 300 جرام', 'Plain Biscuits 300g', snacks_id, 'علبة', 10.00, 9.00, 6.00, 250, true, 15),
    ('SNACK-009', 'كيك شوكولاتة 250 جرام', 'Chocolate Cake 250g', snacks_id, 'علبة', 22.00, 20.00, 15.00, 120, true, 15),
    ('SNACK-010', 'شوكولاتة أصابع 200 جرام', 'Chocolate Fingers 200g', snacks_id, 'علبة', 25.00, 22.00, 16.00, 140, true, 15);

    -- ============================================
    -- مواد معلبة (Canned Goods) - 8 products
    -- ============================================
    INSERT INTO products (sku, name_ar, name_en, category_id, unit, unit_price, sale_price, cost_price, current_stock, is_active, tax_rate) VALUES
    ('CANNED-001', 'طماطم معلبة 400 جرام', 'Canned Tomatoes 400g', canned_id, 'علبة', 8.00, 7.00, 5.00, 300, true, 15),
    ('CANNED-002', 'فول مدمس 400 جرام', 'Ful Medames 400g', canned_id, 'علبة', 6.00, 5.50, 4.00, 400, true, 15),
    ('CANNED-003', 'تونة 185 جرام', 'Tuna 185g', canned_id, 'علبة', 22.00, 20.00, 15.00, 200, true, 15),
    ('CANNED-004', 'سردين 125 جرام', 'Sardines 125g', canned_id, 'علبة', 12.00, 10.00, 8.00, 250, true, 15),
    ('CANNED-005', 'ذرة حلوة 340 جرام', 'Sweet Corn 340g', canned_id, 'علبة', 10.00, 9.00, 6.00, 200, true, 15),
    ('CANNED-006', 'بازلاء 400 جرام', 'Green Peas 400g', canned_id, 'علبة', 8.00, 7.00, 5.00, 180, true, 15),
    ('CANNED-007', 'فاصوليا 400 جرام', 'Baked Beans 400g', canned_id, 'علبة', 9.00, 8.00, 6.00, 150, true, 15),
    ('CANNED-008', 'زيتون أخضر 350 جرام', 'Green Olives 350g', canned_id, 'علبة', 15.00, 13.00, 10.00, 120, true, 15);

    -- ============================================
    -- مجمدات (Frozen Foods) - 8 products
    -- ============================================
    INSERT INTO products (sku, name_ar, name_en, category_id, unit, unit_price, sale_price, cost_price, current_stock, is_active, tax_rate) VALUES
    ('FROZEN-001', 'بسبوسة فراخ 400 جرام', 'Chicken Nuggets 400g', frozen_id, 'كيس', 35.00, 32.00, 24.00, 100, true, 15),
    ('FROZEN-002', 'أصابع موزاريلا 300 جرام', 'Mozzarella Sticks 300g', frozen_id, 'كيس', 28.00, 25.00, 18.00, 80, true, 15),
    ('FROZEN-003', 'بطاطس محمرة 1 كجم', 'French Fries 1kg', frozen_id, 'كيس', 25.00, 22.00, 16.00, 120, true, 15),
    ('FROZEN-004', 'خضار مشكل 500 جرام', 'Mixed Vegetables 500g', frozen_id, 'كيس', 15.00, 13.00, 10.00, 150, true, 15),
    ('FROZEN-005', 'سمك فيليه 500 جرام', 'Fish Fillet 500g', frozen_id, 'كيس', 45.00, 40.00, 30.00, 60, true, 15),
    ('FROZEN-006', 'جمبري 500 جرام', 'Shrimp 500g', frozen_id, 'كيس', 65.00, 60.00, 45.00, 50, true, 15),
    ('FROZEN-007', 'بيتزا مارجريتا 400 جرام', 'Margherita Pizza 400g', frozen_id, 'علبة', 30.00, 28.00, 20.00, 90, true, 15),
    ('FROZEN-008', 'آيس كريم فانيلا 500 مل', 'Vanilla Ice Cream 500ml', frozen_id, 'علبة', 25.00, 22.00, 16.00, 100, true, 15);

    -- ============================================
    -- مخبوزات (Bakery) - 8 products
    -- ============================================
    INSERT INTO products (sku, name_ar, name_en, category_id, unit, unit_price, sale_price, cost_price, current_stock, is_active, tax_rate) VALUES
    ('BAKERY-001', 'خبز بلدي كبير', 'Baladi Bread Large', bakery_id, 'ربطة', 5.00, 4.00, 2.50, 500, true, 15),
    ('BAKERY-002', 'خبز توست أبيض 600 جرام', 'White Toast Bread 600g', bakery_id, 'كيس', 15.00, 13.00, 9.00, 200, true, 15),
    ('BAKERY-003', 'خبز توست سن 600 جرام', 'Whole Wheat Toast 600g', bakery_id, 'كيس', 16.00, 14.00, 10.00, 180, true, 15),
    ('BAKERY-004', 'كرواسون 4 قطع', 'Croissant 4pcs', bakery_id, 'علبة', 20.00, 18.00, 12.00, 100, true, 15),
    ('BAKERY-005', 'فطيرة جبنة', 'Cheese Pie', bakery_id, 'قطعة', 8.00, 7.00, 5.00, 150, true, 15),
    ('BAKERY-006', 'فطيرة سبانخ', 'Spinach Pie', bakery_id, 'قطعة', 8.00, 7.00, 5.00, 120, true, 15),
    ('BAKERY-007', 'كعك بلدي 500 جرام', 'Baladi Cake 500g', bakery_id, 'كيس', 18.00, 16.00, 12.00, 80, true, 15),
    ('BAKERY-008', 'بسكوت 300 جرام', 'Biscuit 300g', bakery_id, 'كيس', 12.00, 10.00, 7.00, 150, true, 15);

    -- ============================================
    -- منظفات (Cleaning Supplies) - 8 products
    -- ============================================
    INSERT INTO products (sku, name_ar, name_en, category_id, unit, unit_price, sale_price, cost_price, current_stock, is_active, tax_rate) VALUES
    ('CLEAN-001', 'مسحوق غسيل 3 كجم', 'Detergent Powder 3kg', cleaning_id, 'كيس', 45.00, 40.00, 30.00, 100, true, 15),
    ('CLEAN-002', 'سائل غسيل أطباق 1 لتر', 'Dishwashing Liquid 1L', cleaning_id, 'زجاجة', 15.00, 13.00, 9.00, 200, true, 15),
    ('CLEAN-003', 'منظف أرضيات 1 لتر', 'Floor Cleaner 1L', cleaning_id, 'زجاجة', 18.00, 16.00, 12.00, 150, true, 15),
    ('CLEAN-004', 'كلور 1 لتر', 'Bleach 1L', cleaning_id, 'زجاجة', 10.00, 9.00, 6.00, 250, true, 15),
    ('CLEAN-005', 'إسفنجة مطبخ 5 قطع', 'Kitchen Sponge 5pcs', cleaning_id, 'علبة', 8.00, 7.00, 5.00, 300, true, 15),
    ('CLEAN-006', 'مناديل ورقية 3 رول', 'Paper Towels 3 Rolls', cleaning_id, 'عبوة', 15.00, 13.00, 9.00, 200, true, 15),
    ('CLEAN-007', 'أكياس قمامة 50 كيس', 'Garbage Bags 50pcs', cleaning_id, 'رول', 12.00, 10.00, 7.00, 180, true, 15),
    ('CLEAN-008', 'منظف زجاج 500 مل', 'Glass Cleaner 500ml', cleaning_id, 'زجاجة', 14.00, 12.00, 9.00, 120, true, 15);

    -- ============================================
    -- عناية شخصية (Personal Care) - 8 products
    -- ============================================
    INSERT INTO products (sku, name_ar, name_en, category_id, unit, unit_price, sale_price, cost_price, current_stock, is_active, tax_rate) VALUES
    ('PERSONAL-001', 'شامبو 400 مل', 'Shampoo 400ml', personal_id, 'زجاجة', 35.00, 32.00, 24.00, 150, true, 15),
    ('PERSONAL-002', 'بلسم 400 مل', 'Conditioner 400ml', personal_id, 'زجاجة', 30.00, 28.00, 20.00, 120, true, 15),
    ('PERSONAL-003', 'صابون استحمام 400 مل', 'Body Wash 400ml', personal_id, 'زجاجة', 28.00, 25.00, 18.00, 130, true, 15),
    ('PERSONAL-004', 'معجون أسنان 100 مل', 'Toothpaste 100ml', personal_id, 'علبة', 18.00, 16.00, 12.00, 200, true, 15),
    ('PERSONAL-005', 'فرشاة أسنان', 'Toothbrush', personal_id, 'قطعة', 12.00, 10.00, 7.00, 250, true, 15),
    ('PERSONAL-006', 'ديودورانت 150 مل', 'Deodorant 150ml', personal_id, 'علبة', 35.00, 32.00, 24.00, 100, true, 15),
    ('PERSONAL-007', 'كريم يد 100 مل', 'Hand Cream 100ml', personal_id, 'علبة', 22.00, 20.00, 14.00, 150, true, 15),
    ('PERSONAL-008', 'مناديل وجه 100 منديل', 'Facial Tissues 100pcs', personal_id, 'علبة', 10.00, 9.00, 6.00, 300, true, 15);

    -- ============================================
    -- توابل وبهارات (Spices & Herbs) - 8 products
    -- ============================================
    INSERT INTO products (sku, name_ar, name_en, category_id, unit, unit_price, sale_price, cost_price, current_stock, is_active, tax_rate) VALUES
    ('SPICE-001', 'ملح 1 كجم', 'Salt 1kg', spices_id, 'كيس', 5.00, 4.00, 2.50, 400, true, 15),
    ('SPICE-002', 'فلفل أسود 100 جرام', 'Black Pepper 100g', spices_id, 'علبة', 25.00, 22.00, 16.00, 200, true, 15),
    ('SPICE-003', 'كمون 100 جرام', 'Cumin 100g', spices_id, 'علبة', 20.00, 18.00, 14.00, 150, true, 15),
    ('SPICE-004', 'كركم 100 جرام', 'Turmeric 100g', spices_id, 'علبة', 18.00, 16.00, 12.00, 180, true, 15),
    ('SPICE-005', 'قرفة 50 جرام', 'Cinnamon 50g', spices_id, 'علبة', 15.00, 13.00, 9.00, 200, true, 15),
    ('SPICE-006', 'بهارات مشكلة 100 جرام', 'Mixed Spices 100g', spices_id, 'علبة', 22.00, 20.00, 14.00, 150, true, 15),
    ('SPICE-007', 'بابريكا 100 جرام', 'Paprika 100g', spices_id, 'علبة', 18.00, 16.00, 12.00, 120, true, 15),
    ('SPICE-008', 'زعتر 50 جرام', 'Thyme 50g', spices_id, 'علبة', 12.00, 10.00, 7.00, 200, true, 15);

    -- ============================================
    -- زيوت وسمن (Oils & Ghee) - 8 products
    -- ============================================
    INSERT INTO products (sku, name_ar, name_en, category_id, unit, unit_price, sale_price, cost_price, current_stock, is_active, tax_rate) VALUES
    ('OIL-001', 'زيت ذرة 1 لتر', 'Corn Oil 1L', oils_id, 'زجاجة', 35.00, 32.00, 24.00, 150, true, 15),
    ('OIL-002', 'زيت عباد شمس 1 لتر', 'Sunflower Oil 1L', oils_id, 'زجاجة', 30.00, 28.00, 20.00, 180, true, 15),
    ('OIL-003', 'زيت زيتون 500 مل', 'Olive Oil 500ml', oils_id, 'زجاجة', 55.00, 50.00, 38.00, 100, true, 15),
    ('OIL-004', 'سمن بلدي 500 جرام', 'Ghee 500g', oils_id, 'علبة', 45.00, 40.00, 30.00, 80, true, 15),
    ('OIL-005', 'زيت كانولا 1 لتر', 'Canola Oil 1L', oils_id, 'زجاجة', 32.00, 30.00, 22.00, 120, true, 15),
    ('OIL-006', 'زيت سمسم 250 مل', 'Sesame Oil 250ml', oils_id, 'زجاجة', 28.00, 25.00, 18.00, 90, true, 15),
    ('OIL-007', 'زيت نباتي 1.8 لتر', 'Vegetable Oil 1.8L', oils_id, 'زجاجة', 50.00, 45.00, 35.00, 100, true, 15),
    ('OIL-008', 'سمن نباتي 1 كجم', 'Vegetable Ghee 1kg', oils_id, 'علبة', 35.00, 32.00, 24.00, 110, true, 15);

    -- ============================================
    -- مكرونة وأرز (Pasta & Rice) - 8 products
    -- ============================================
    INSERT INTO products (sku, name_ar, name_en, category_id, unit, unit_price, sale_price, cost_price, current_stock, is_active, tax_rate) VALUES
    ('PASTA-001', 'مكرونة إسباجتي 500 جرام', 'Spaghetti 500g', pasta_id, 'كيس', 10.00, 9.00, 6.00, 300, true, 15),
    ('PASTA-002', 'مكرونة قلم 500 جرام', 'Penne 500g', pasta_id, 'كيس', 10.00, 9.00, 6.00, 250, true, 15),
    ('PASTA-003', 'مكرونة شعرية 500 جرام', 'Vermicelli 500g', pasta_id, 'كيس', 9.00, 8.00, 5.00, 200, true, 15),
    ('PASTA-004', 'أرز بسمتي 1 كجم', 'Basmati Rice 1kg', pasta_id, 'كيس', 25.00, 22.00, 16.00, 200, true, 15),
    ('PASTA-005', 'أرز أبيض 1 كجم', 'White Rice 1kg', pasta_id, 'كيس', 20.00, 18.00, 14.00, 250, true, 15),
    ('PASTA-006', 'أرز مصري 1 كجم', 'Egyptian Rice 1kg', pasta_id, 'كيس', 18.00, 16.00, 12.00, 300, true, 15),
    ('PASTA-007', 'لازانيا 500 جرام', 'Lasagna 500g', pasta_id, 'علبة', 18.00, 16.00, 12.00, 100, true, 15),
    ('PASTA-008', 'نودلز 75 جرام', 'Noodles 75g', pasta_id, 'علبة', 5.00, 4.00, 2.50, 400, true, 15);

    -- ============================================
    -- حلويات وشوكولاتة (Sweets & Chocolate) - 10 products
    -- ============================================
    INSERT INTO products (sku, name_ar, name_en, category_id, unit, unit_price, sale_price, cost_price, current_stock, is_active, tax_rate) VALUES
    ('SWEET-001', 'شوكولاتة بالحليب 100 جرام', 'Milk Chocolate 100g', sweets_id, 'لوح', 15.00, 13.00, 9.00, 300, true, 15),
    ('SWEET-002', 'شوكولاتة داكنة 100 جرام', 'Dark Chocolate 100g', sweets_id, 'لوح', 18.00, 16.00, 12.00, 200, true, 15),
    ('SWEET-003', 'بسكويت شوكولاتة 200 جرام', 'Chocolate Biscuits 200g', sweets_id, 'علبة', 12.00, 10.00, 7.00, 250, true, 15),
    ('SWEET-004', 'حلوى تركية 500 جرام', 'Turkish Delight 500g', sweets_id, 'علبة', 35.00, 32.00, 24.00, 100, true, 15),
    ('SWEET-005', 'مارشميلو 200 جرام', 'Marshmallow 200g', sweets_id, 'كيس', 10.00, 9.00, 6.00, 180, true, 15),
    ('SWEET-006', 'جيلي 80 جرام', 'Jelly 80g', sweets_id, 'علبة', 5.00, 4.00, 2.50, 300, true, 15),
    ('SWEET-007', 'بونبون 200 جرام', 'Bonbons 200g', sweets_id, 'علبة', 18.00, 16.00, 12.00, 150, true, 15),
    ('SWEET-008', 'كيكة شوكولاتة 400 جرام', 'Chocolate Cake 400g', sweets_id, 'علبة', 30.00, 28.00, 20.00, 80, true, 15),
    ('SWEET-009', 'مهلبية 200 جرام', 'Muhallabia 200g', sweets_id, 'علبة', 8.00, 7.00, 5.00, 200, true, 15),
    ('SWEET-010', 'عسل نحل 500 جرام', 'Honey 500g', sweets_id, 'زجاجة', 55.00, 50.00, 38.00, 60, true, 15);

END $$;
