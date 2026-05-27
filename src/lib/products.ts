// Complete product data model with wholesale/retail, images, supplier, barcode, expiry

export interface SupplierInfo {
  id: string;
  name: string;
  phone: string;
  taxNumber: string;
}

export interface ProductFull {
  id: string;
  barcode: string;
  name: string;
  nameAr: string;
  description?: string;
  images: string[];

  // Category
  categoryId: string;
  categoryNameAr: string;

  // Supplier
  supplierId: string;
  supplierName: string;

  // Pricing
  retailPrice: number;       // سعر التجزئة
  wholesalePrice: number;    // سعر الجملة (minimum qty)
  wholesaleMinQty: number;   // minimum quantity for wholesale price (default 12)
  costPrice: number;         // سعر التكلفة

  // Units
  baseUnit: string;          // الوحدة الأساسية
  allowedUnits: string[];    // الوحدات المسموح بها
  unitConversions: Record<string, number>; // e.g., { "carton": 12, "piece": 1 }

  // Stock
  currentStock: number;
  minStock: number;
  maxStock: number;

  // Expiry
  hasExpiry: boolean;
  manufactureDate?: number;
  expiryDate?: number;

  // Invoice
  lastInvoiceNumber?: string;
  lastInvoiceDate?: number;

  // Status
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface StockMovementRecord {
  id: string;
  productId: string;
  type: 'in' | 'out' | 'wholesale_out' | 'retail_out' | 'return' | 'adjustment';
  quantity: number;
  unit: string;
  price: number;
  total: number;
  reference: string; // invoice or order number
  notes?: string;
  userId: string;
  date: number;
}

// Sample product database (50+ products)
export const PRODUCTS_DB: ProductFull[] = [
  // ===== مشروبات =====
  { id: 'p1', barcode: '1000001', name: 'Coca Cola Can', nameAr: 'كوكاكولا علبة', categoryId: 'cat1', categoryNameAr: 'مشروبات', supplierId: 'sup1', supplierName: 'شركة المشروبات', retailPrice: 5, wholesalePrice: 4.5, wholesaleMinQty: 12, costPrice: 3, baseUnit: 'can', allowedUnits: ['can', 'bottle', 'carton', 'packet'], unitConversions: { can: 1, bottle: 2, carton: 24, packet: 6 }, currentStock: 500, minStock: 50, maxStock: 2000, hasExpiry: true, active: true, createdAt: Date.now() - 86400000 * 60, updatedAt: Date.now(), images: [] },
  { id: 'p2', barcode: '1000002', name: 'Pepsi Can', nameAr: 'بيبسي علبة', categoryId: 'cat1', categoryNameAr: 'مشروبات', supplierId: 'sup1', supplierName: 'شركة المشروبات', retailPrice: 5, wholesalePrice: 4.5, wholesaleMinQty: 12, costPrice: 3, baseUnit: 'can', allowedUnits: ['can', 'carton', 'packet'], unitConversions: { can: 1, carton: 24, packet: 6 }, currentStock: 450, minStock: 40, maxStock: 1500, hasExpiry: true, active: true, createdAt: Date.now() - 86400000 * 60, updatedAt: Date.now(), images: [] },
  { id: 'p3', barcode: '1000003', name: 'Water 1.5L', nameAr: 'ماء 1.5 لتر', categoryId: 'cat1', categoryNameAr: 'مشروبات', supplierId: 'sup1', supplierName: 'شركة المشروبات', retailPrice: 3, wholesalePrice: 2.5, wholesaleMinQty: 24, costPrice: 1.5, baseUnit: 'bottle', allowedUnits: ['bottle', 'carton', 'pack'], unitConversions: { bottle: 1, carton: 12, pack: 6 }, currentStock: 1200, minStock: 100, maxStock: 5000, hasExpiry: false, active: true, createdAt: Date.now() - 86400000 * 60, updatedAt: Date.now(), images: [] },
  { id: 'p4', barcode: '1000004', name: 'Miranda Orange', nameAr: 'ميرندا برتقال', categoryId: 'cat1', categoryNameAr: 'مشروبات', supplierId: 'sup1', supplierName: 'شركة المشروبات', retailPrice: 5, wholesalePrice: 4.5, wholesaleMinQty: 12, costPrice: 3, baseUnit: 'can', allowedUnits: ['can', 'carton'], unitConversions: { can: 1, carton: 24 }, currentStock: 300, minStock: 30, maxStock: 1000, hasExpiry: true, active: true, createdAt: Date.now() - 86400000 * 45, updatedAt: Date.now(), images: [] },
  { id: 'p5', barcode: '1000005', name: 'Energy Drink', nameAr: 'مشروب طاقة', categoryId: 'cat1', categoryNameAr: 'مشروبات', supplierId: 'sup2', supplierName: 'شركة الطاقة', retailPrice: 12, wholesalePrice: 10, wholesaleMinQty: 12, costPrice: 7, baseUnit: 'can', allowedUnits: ['can', 'packet'], unitConversions: { can: 1, packet: 6 }, currentStock: 200, minStock: 20, maxStock: 600, hasExpiry: true, active: true, createdAt: Date.now() - 86400000 * 30, updatedAt: Date.now(), images: [] },

  // ===== ألبان =====
  { id: 'p6', barcode: '2000001', name: 'Full Cream Milk 1L', nameAr: 'حليب كامل الدسم 1 لتر', categoryId: 'cat2', categoryNameAr: 'ألبان', supplierId: 'sup3', supplierName: 'مصنع الألبان', retailPrice: 12, wholesalePrice: 10.5, wholesaleMinQty: 12, costPrice: 8, baseUnit: 'bottle', allowedUnits: ['bottle', 'carton'], unitConversions: { bottle: 1, carton: 12 }, currentStock: 180, minStock: 20, maxStock: 500, hasExpiry: true, active: true, createdAt: Date.now() - 86400000 * 30, updatedAt: Date.now(), images: [] },
  { id: 'p7', barcode: '2000002', name: 'Yogurt 500ml', nameAr: 'زبادي 500 مل', categoryId: 'cat2', categoryNameAr: 'ألبان', supplierId: 'sup3', supplierName: 'مصنع الألبان', retailPrice: 8, wholesalePrice: 7, wholesaleMinQty: 12, costPrice: 5, baseUnit: 'piece', allowedUnits: ['piece', 'packet', 'box'], unitConversions: { piece: 1, packet: 6, box: 24 }, currentStock: 250, minStock: 30, maxStock: 800, hasExpiry: true, active: true, createdAt: Date.now() - 86400000 * 30, updatedAt: Date.now(), images: [] },
  { id: 'p8', barcode: '2000003', name: 'Labnah', nameAr: 'لبنة', categoryId: 'cat2', categoryNameAr: 'ألبان', supplierId: 'sup3', supplierName: 'مصنع الألبان', retailPrice: 15, wholesalePrice: 13, wholesaleMinQty: 12, costPrice: 10, baseUnit: 'piece', allowedUnits: ['piece', 'packet'], unitConversions: { piece: 1, packet: 6 }, currentStock: 100, minStock: 15, maxStock: 400, hasExpiry: true, active: true, createdAt: Date.now() - 86400000 * 20, updatedAt: Date.now(), images: [] },
  { id: 'p9', barcode: '2000004', name: 'Cream Cheese', nameAr: 'جبنة كيري', categoryId: 'cat2', categoryNameAr: 'ألبان', supplierId: 'sup3', supplierName: 'مصنع الألبان', retailPrice: 18, wholesalePrice: 16, wholesaleMinQty: 12, costPrice: 12, baseUnit: 'packet', allowedUnits: ['packet', 'box'], unitConversions: { packet: 1, box: 24 }, currentStock: 80, minStock: 10, maxStock: 300, hasExpiry: true, active: true, createdAt: Date.now() - 86400000 * 15, updatedAt: Date.now(), images: [] },

  // ===== مخبوزات =====
  { id: 'p10', barcode: '3000001', name: 'White Bread', nameAr: 'خبز أبيض', categoryId: 'cat3', categoryNameAr: 'مخبوزات', supplierId: 'sup4', supplierName: 'مخبز الرغيف', retailPrice: 3, wholesalePrice: 2.5, wholesaleMinQty: 20, costPrice: 1.5, baseUnit: 'piece', allowedUnits: ['piece', 'bundle'], unitConversions: { piece: 1, bundle: 5 }, currentStock: 400, minStock: 50, maxStock: 1000, hasExpiry: true, active: true, createdAt: Date.now() - 86400000 * 20, updatedAt: Date.now(), images: [] },
  { id: 'p11', barcode: '3000002', name: 'Brown Bread', nameAr: 'خبز أسمر', categoryId: 'cat3', categoryNameAr: 'مخبوزات', supplierId: 'sup4', supplierName: 'مخبز الرغيف', retailPrice: 4, wholesalePrice: 3.5, wholesaleMinQty: 20, costPrice: 2, baseUnit: 'piece', allowedUnits: ['piece', 'bundle'], unitConversions: { piece: 1, bundle: 5 }, currentStock: 200, minStock: 30, maxStock: 600, hasExpiry: true, active: true, createdAt: Date.now() - 86400000 * 20, updatedAt: Date.now(), images: [] },
  { id: 'p12', barcode: '3000003', name: 'Croissant', nameAr: 'كرواسون', categoryId: 'cat3', categoryNameAr: 'مخبوزات', supplierId: 'sup4', supplierName: 'مخبز الرغيف', retailPrice: 5, wholesalePrice: 4, wholesaleMinQty: 25, costPrice: 2.5, baseUnit: 'piece', allowedUnits: ['piece', 'bundle'], unitConversions: { piece: 1, bundle: 5 }, currentStock: 150, minStock: 20, maxStock: 500, hasExpiry: true, active: true, createdAt: Date.now() - 86400000 * 15, updatedAt: Date.now(), images: [] },

  // ===== بيض =====
  { id: 'p13', barcode: '4000001', name: 'Eggs 30pc', nameAr: 'بيض 30 حبة', categoryId: 'cat4', categoryNameAr: 'بيض', supplierId: 'sup5', supplierName: 'مزرعة الربيع', retailPrice: 28, wholesalePrice: 25, wholesaleMinQty: 12, costPrice: 20, baseUnit: 'eggCarton', allowedUnits: ['eggCarton', 'piece'], unitConversions: { eggCarton: 1, piece: 30 }, currentStock: 120, minStock: 15, maxStock: 400, hasExpiry: true, active: true, createdAt: Date.now() - 86400000 * 15, updatedAt: Date.now(), images: [] },
  { id: 'p14', barcode: '4000002', name: 'Eggs 15pc', nameAr: 'بيض 15 حبة', categoryId: 'cat4', categoryNameAr: 'بيض', supplierId: 'sup5', supplierName: 'مزرعة الربيع', retailPrice: 16, wholesalePrice: 14, wholesaleMinQty: 12, costPrice: 11, baseUnit: 'piece', allowedUnits: ['piece', 'packet'], unitConversions: { piece: 1, packet: 15 }, currentStock: 80, minStock: 10, maxStock: 300, hasExpiry: true, active: true, createdAt: Date.now() - 86400000 * 10, updatedAt: Date.now(), images: [] },

  // ===== مواد غذائية =====
  { id: 'p15', barcode: '5000001', name: 'Rice 5kg', nameAr: 'أرز بسمتي 5 كيلو', categoryId: 'cat5', categoryNameAr: 'مواد غذائية', supplierId: 'sup6', supplierName: 'شركة المواد الغذائية', retailPrice: 35, wholesalePrice: 30, wholesaleMinQty: 20, costPrice: 25, baseUnit: 'sack', allowedUnits: ['kg', 'sack'], unitConversions: { kg: 1, sack: 5 }, currentStock: 100, minStock: 10, maxStock: 300, hasExpiry: true, active: true, createdAt: Date.now() - 86400000 * 45, updatedAt: Date.now(), images: [] },
  { id: 'p16', barcode: '5000002', name: 'Sugar 1kg', nameAr: 'سكر 1 كيلو', categoryId: 'cat5', categoryNameAr: 'مواد غذائية', supplierId: 'sup6', supplierName: 'شركة المواد الغذائية', retailPrice: 8, wholesalePrice: 7, wholesaleMinQty: 20, costPrice: 5, baseUnit: 'kg', allowedUnits: ['kg', 'roll', 'sack'], unitConversions: { kg: 1, roll: 1, sack: 25 }, currentStock: 500, minStock: 50, maxStock: 2000, hasExpiry: false, active: true, createdAt: Date.now() - 86400000 * 45, updatedAt: Date.now(), images: [] },
  { id: 'p17', barcode: '5000003', name: 'Cooking Oil 1L', nameAr: 'زيت طبخ 1 لتر', categoryId: 'cat5', categoryNameAr: 'مواد غذائية', supplierId: 'sup6', supplierName: 'شركة المواد الغذائية', retailPrice: 25, wholesalePrice: 22, wholesaleMinQty: 12, costPrice: 18, baseUnit: 'bottle', allowedUnits: ['bottle', 'liter', 'carton'], unitConversions: { bottle: 1, liter: 1, carton: 12 }, currentStock: 150, minStock: 20, maxStock: 500, hasExpiry: true, active: true, createdAt: Date.now() - 86400000 * 30, updatedAt: Date.now(), images: [] },
  { id: 'p18', barcode: '5000004', name: 'Pasta 500g', nameAr: 'معكرونة 500 جم', categoryId: 'cat5', categoryNameAr: 'مواد غذائية', supplierId: 'sup7', supplierName: 'شركة المعكرونة', retailPrice: 6, wholesalePrice: 5, wholesaleMinQty: 24, costPrice: 3.5, baseUnit: 'packet', allowedUnits: ['packet', 'piece', 'carton'], unitConversions: { packet: 1, piece: 1, carton: 24 }, currentStock: 350, minStock: 40, maxStock: 1000, hasExpiry: true, active: true, createdAt: Date.now() - 86400000 * 30, updatedAt: Date.now(), images: [] },
  { id: 'p19', barcode: '5000005', name: 'Tomato Sauce', nameAr: 'صلصة طماطم', categoryId: 'cat5', categoryNameAr: 'مواد غذائية', supplierId: 'sup7', supplierName: 'شركة المعكرونة', retailPrice: 10, wholesalePrice: 8.5, wholesaleMinQty: 12, costPrice: 6, baseUnit: 'bottle', allowedUnits: ['bottle', 'packet'], unitConversions: { bottle: 1, packet: 6 }, currentStock: 120, minStock: 15, maxStock: 400, hasExpiry: true, active: true, createdAt: Date.now() - 86400000 * 20, updatedAt: Date.now(), images: [] },
  { id: 'p20', barcode: '5000006', name: 'Canned Tuna', nameAr: 'تونة معلبة', categoryId: 'cat5', categoryNameAr: 'مواد غذائية', supplierId: 'sup8', supplierName: 'شركة الأسماك', retailPrice: 12, wholesalePrice: 10, wholesaleMinQty: 24, costPrice: 7, baseUnit: 'can', allowedUnits: ['can', 'carton'], unitConversions: { can: 1, carton: 24 }, currentStock: 200, minStock: 20, maxStock: 600, hasExpiry: true, active: true, createdAt: Date.now() - 86400000 * 25, updatedAt: Date.now(), images: [] },

  // ===== وجبات خفيفة =====
  { id: 'p21', barcode: '6000001', name: 'Chips Salt', nameAr: 'شبسي ملح', categoryId: 'cat6', categoryNameAr: 'وجبات خفيفة', supplierId: 'sup9', supplierName: 'شركة المقرمشات', retailPrice: 3, wholesalePrice: 2.5, wholesaleMinQty: 24, costPrice: 1.5, baseUnit: 'packet', allowedUnits: ['packet', 'box'], unitConversions: { packet: 1, box: 24 }, currentStock: 600, minStock: 60, maxStock: 2000, hasExpiry: true, active: true, createdAt: Date.now() - 86400000 * 20, updatedAt: Date.now(), images: [] },
  { id: 'p22', barcode: '6000002', name: 'Chips Chili', nameAr: 'شبسي شطة', categoryId: 'cat6', categoryNameAr: 'وجبات خفيفة', supplierId: 'sup9', supplierName: 'شركة المقرمشات', retailPrice: 3, wholesalePrice: 2.5, wholesaleMinQty: 24, costPrice: 1.5, baseUnit: 'packet', allowedUnits: ['packet', 'box'], unitConversions: { packet: 1, box: 24 }, currentStock: 500, minStock: 50, maxStock: 1500, hasExpiry: true, active: true, createdAt: Date.now() - 86400000 * 20, updatedAt: Date.now(), images: [] },
  { id: 'p23', barcode: '6000003', name: 'Chocolate Bar', nameAr: 'شوكولاتة', categoryId: 'cat6', categoryNameAr: 'وجبات خفيفة', supplierId: 'sup10', supplierName: 'شركة الحلويات', retailPrice: 7, wholesalePrice: 6, wholesaleMinQty: 24, costPrice: 4, baseUnit: 'piece', allowedUnits: ['piece', 'box'], unitConversions: { piece: 1, box: 24 }, currentStock: 300, minStock: 30, maxStock: 800, hasExpiry: true, active: true, createdAt: Date.now() - 86400000 * 15, updatedAt: Date.now(), images: [] },
  { id: 'p24', barcode: '6000004', name: 'Biscuits', nameAr: 'بسكويت', categoryId: 'cat6', categoryNameAr: 'وجبات خفيفة', supplierId: 'sup10', supplierName: 'شركة الحلويات', retailPrice: 5, wholesalePrice: 4, wholesaleMinQty: 24, costPrice: 3, baseUnit: 'packet', allowedUnits: ['packet', 'box'], unitConversions: { packet: 1, box: 24 }, currentStock: 250, minStock: 25, maxStock: 700, hasExpiry: true, active: true, createdAt: Date.now() - 86400000 * 15, updatedAt: Date.now(), images: [] },

  // ===== دخان =====
  { id: 'p25', barcode: '7000001', name: 'Marlboro Red', nameAr: 'مارلبورو أحمر', categoryId: 'cat7', categoryNameAr: 'دخان', supplierId: 'sup11', supplierName: 'شركة التبغ', retailPrice: 12, wholesalePrice: 10.5, wholesaleMinQty: 10, costPrice: 8, baseUnit: 'cigarette', allowedUnits: ['cigarette', 'piece', 'carton'], unitConversions: { cigarette: 1, piece: 20, carton: 10 }, currentStock: 400, minStock: 50, maxStock: 1000, hasExpiry: false, active: true, createdAt: Date.now() - 86400000 * 30, updatedAt: Date.now(), images: [] },

  // ===== خضار وفواكه =====
  { id: 'p26', barcode: '8000001', name: 'Tomato', nameAr: 'طماطم', categoryId: 'cat8', categoryNameAr: 'خضار وفواكه', supplierId: 'sup12', supplierName: 'سوق الخضار', retailPrice: 5, wholesalePrice: 4, wholesaleMinQty: 10, costPrice: 3, baseUnit: 'kg', allowedUnits: ['kg', 'gram', 'piece'], unitConversions: { kg: 1, gram: 0.001, piece: 0.2 }, currentStock: 80, minStock: 20, maxStock: 300, hasExpiry: true, active: true, createdAt: Date.now() - 86400000 * 5, updatedAt: Date.now(), images: [] },
  { id: 'p27', barcode: '8000002', name: 'Potato', nameAr: 'بطاطس', categoryId: 'cat8', categoryNameAr: 'خضار وفواكه', supplierId: 'sup12', supplierName: 'سوق الخضار', retailPrice: 4, wholesalePrice: 3, wholesaleMinQty: 20, costPrice: 2, baseUnit: 'kg', allowedUnits: ['kg', 'sack'], unitConversions: { kg: 1, sack: 25 }, currentStock: 200, minStock: 30, maxStock: 500, hasExpiry: true, active: true, createdAt: Date.now() - 86400000 * 5, updatedAt: Date.now(), images: [] },
  { id: 'p28', barcode: '8000003', name: 'Apple Red', nameAr: 'تفاح أحمر', categoryId: 'cat8', categoryNameAr: 'خضار وفواكه', supplierId: 'sup12', supplierName: 'سوق الخضار', retailPrice: 12, wholesalePrice: 10, wholesaleMinQty: 10, costPrice: 7, baseUnit: 'kg', allowedUnits: ['kg', 'gram', 'piece'], unitConversions: { kg: 1, gram: 0.001, piece: 0.2 }, currentStock: 60, minStock: 10, maxStock: 200, hasExpiry: true, active: true, createdAt: Date.now() - 86400000 * 5, updatedAt: Date.now(), images: [] },
  { id: 'p29', barcode: '8000004', name: 'Banana', nameAr: 'موز', categoryId: 'cat8', categoryNameAr: 'خضار وفواكه', supplierId: 'sup12', supplierName: 'سوق الخضار', retailPrice: 8, wholesalePrice: 6.5, wholesaleMinQty: 10, costPrice: 5, baseUnit: 'kg', allowedUnits: ['kg', 'piece'], unitConversions: { kg: 1, piece: 0.15 }, currentStock: 90, minStock: 15, maxStock: 250, hasExpiry: true, active: true, createdAt: Date.now() - 86400000 * 5, updatedAt: Date.now(), images: [] },
  { id: 'p30', barcode: '8000005', name: 'Onion', nameAr: 'بصل', categoryId: 'cat8', categoryNameAr: 'خضار وفواكه', supplierId: 'sup12', supplierName: 'سوق الخضار', retailPrice: 4, wholesalePrice: 3, wholesaleMinQty: 20, costPrice: 2, baseUnit: 'kg', allowedUnits: ['kg', 'sack'], unitConversions: { kg: 1, sack: 25 }, currentStock: 150, minStock: 20, maxStock: 400, hasExpiry: true, active: true, createdAt: Date.now() - 86400000 * 5, updatedAt: Date.now(), images: [] },
];
