export interface UnitInfo {
  id: string;
  nameAr: string;
  nameEn: string;
  symbol: string;
  category: 'piece' | 'weight' | 'volume' | 'bundle' | 'pack';
  baseUnit?: string;
  baseQty?: number;
  isBase: boolean;
  sort: number;
}

export const UNITS: Record<string, UnitInfo> = {
  piece:     { id: 'piece', nameAr: 'قطعة', nameEn: 'Piece', symbol: 'قطعة', category: 'piece', isBase: true, sort: 1 },
  kg:        { id: 'kg', nameAr: 'كيلو', nameEn: 'Kilogram', symbol: 'كجم', category: 'weight', isBase: true, sort: 2 },
  gram:      { id: 'gram', nameAr: 'جرام', nameEn: 'Gram', symbol: 'جم', category: 'weight', baseUnit: 'kg', baseQty: 0.001, isBase: false, sort: 3 },
  carton:    { id: 'carton', nameAr: 'كرتونة', nameEn: 'Carton', symbol: 'كرتونة', category: 'pack', baseUnit: 'piece', baseQty: 12, isBase: false, sort: 4 },
  packet:    { id: 'packet', nameAr: 'قروسة', nameEn: 'Packet', symbol: 'قروسة', category: 'pack', baseUnit: 'piece', baseQty: 6, isBase: false, sort: 5 },
  pack:      { id: 'pack', nameAr: 'باكيت', nameEn: 'Pack', symbol: 'باكيت', category: 'pack', baseUnit: 'piece', baseQty: 10, isBase: false, sort: 6 },
  box:       { id: 'box', nameAr: 'صندوق', nameEn: 'Box', symbol: 'صندوق', category: 'pack', baseUnit: 'piece', baseQty: 24, isBase: false, sort: 7 },
  roll:      { id: 'roll', nameAr: 'لفة', nameEn: 'Roll', symbol: 'لفة', category: 'bundle', isBase: true, sort: 8 },
  bundle:    { id: 'bundle', nameAr: 'حزمة', nameEn: 'Bundle', symbol: 'حزمة', category: 'bundle', baseUnit: 'piece', baseQty: 5, isBase: false, sort: 9 },
  bottle:    { id: 'bottle', nameAr: 'زجاجة', nameEn: 'Bottle', symbol: 'زجاجة', category: 'piece', isBase: true, sort: 10 },
  can:       { id: 'can', nameAr: 'علبة', nameEn: 'Can', symbol: 'علبة', category: 'piece', isBase: true, sort: 11 },
  cigarette: { id: 'cigarette', nameAr: 'سجاير', nameEn: 'Cigarette Pack', symbol: 'سجاير', category: 'pack', baseUnit: 'piece', baseQty: 20, isBase: false, sort: 12 },
  eggCarton: { id: 'eggCarton', nameAr: 'كرتونة بيض', nameEn: 'Egg Carton', symbol: 'كرتونة بيض', category: 'pack', baseUnit: 'piece', baseQty: 30, isBase: false, sort: 13 },
  liter:     { id: 'liter', nameAr: 'لتر', nameEn: 'Liter', symbol: 'لتر', category: 'volume', isBase: true, sort: 14 },
  ml:        { id: 'ml', nameAr: 'ملي', nameEn: 'Milliliter', symbol: 'مل', category: 'volume', baseUnit: 'liter', baseQty: 0.001, isBase: false, sort: 15 },
  sack:      { id: 'sack', nameAr: 'شوال', nameEn: 'Sack', symbol: 'شوال', category: 'pack', baseUnit: 'kg', baseQty: 25, isBase: false, sort: 16 },
};

export const UNIT_LIST = Object.values(UNITS).sort((a, b) => a.sort - b.sort);

export function convertUnit(from: string, to: string, qty: number): number {
  const fromUnit = UNITS[from];
  const toUnit = UNITS[to];
  if (!fromUnit || !toUnit) return qty;
  if (from === to) return qty;
  let baseQty = qty;
  if (fromUnit.baseUnit && fromUnit.baseQty) baseQty = qty * fromUnit.baseQty;
  if (toUnit.baseUnit && toUnit.baseQty) return baseQty / toUnit.baseQty;
  return baseQty;
}

export function formatUnit(qty: number, unitId: string): string {
  const unit = UNITS[unitId];
  if (!unit) return `${qty}`;
  return `${qty} ${unit.symbol}`;
}

export function formatWeight(kg: number): string {
  if (kg < 1) return `${(kg * 1000).toFixed(0)} جم`;
  const whole = Math.floor(kg);
  const grams = Math.round((kg - whole) * 1000);
  if (grams === 0) return `${whole} كجم`;
  return `${whole}.${String(grams).padStart(3, '0')} كجم`;
}

export interface ProductWithUnits {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  baseUnit: string;
  allowedUnits: string[];
  barcode: string;
  image?: string;
}

export const SAMPLE_PRODUCTS_FULL: ProductWithUnits[] = [
  { id: '1', name: 'Coca Cola', nameAr: 'كوكاكولا', price: 5, baseUnit: 'can', allowedUnits: ['can', 'bottle', 'carton', 'packet'], barcode: '123456789' },
  { id: '2', name: 'Pepsi', nameAr: 'بيبسي', price: 5, baseUnit: 'can', allowedUnits: ['can', 'carton', 'packet'], barcode: '987654321' },
  { id: '3', name: 'Water 1.5L', nameAr: 'ماء 1.5 لتر', price: 3, baseUnit: 'bottle', allowedUnits: ['bottle', 'carton', 'pack'], barcode: '111111111' },
  { id: '4', name: 'Bread', nameAr: 'خبز', price: 3, baseUnit: 'piece', allowedUnits: ['piece'], barcode: '222222222' },
  { id: '5', name: 'Eggs 30pc', nameAr: 'بيض 30 حبة', price: 28, baseUnit: 'eggCarton', allowedUnits: ['eggCarton', 'piece'], barcode: '333333333' },
  { id: '6', name: 'Milk 1L', nameAr: 'حليب كامل الدسم', price: 12, baseUnit: 'bottle', allowedUnits: ['bottle', 'carton'], barcode: '444444444' },
  { id: '7', name: 'Yogurt', nameAr: 'زبادي', price: 8, baseUnit: 'piece', allowedUnits: ['piece', 'packet', 'box'], barcode: '555555555' },
  { id: '8', name: 'Rice 5kg', nameAr: 'أرز 5 كيلو', price: 35, baseUnit: 'sack', allowedUnits: ['kg', 'sack'], barcode: '666666666' },
  { id: '9', name: 'Sugar 1kg', nameAr: 'سكر', price: 8, baseUnit: 'kg', allowedUnits: ['kg', 'roll', 'sack'], barcode: '777777777' },
  { id: '10', name: 'Cooking Oil', nameAr: 'زيت طبخ', price: 25, baseUnit: 'bottle', allowedUnits: ['bottle', 'liter', 'carton'], barcode: '888888888' },
  { id: '11', name: 'Pasta 500g', nameAr: 'معكرونة', price: 6, baseUnit: 'packet', allowedUnits: ['packet', 'piece'], barcode: '999999999' },
  { id: '12', name: 'Chips', nameAr: 'شبسي', price: 3, baseUnit: 'packet', allowedUnits: ['packet', 'box'], barcode: '101010101' },
  { id: '13', name: 'Marlboro', nameAr: 'مارلبورو', price: 12, baseUnit: 'cigarette', allowedUnits: ['cigarette', 'piece'], barcode: '121212121' },
  { id: '14', name: 'Tomato', nameAr: 'طماطم', price: 5, baseUnit: 'kg', allowedUnits: ['kg', 'gram'], barcode: '131313131' },
  { id: '15', name: 'Potato', nameAr: 'بطاطس', price: 4, baseUnit: 'kg', allowedUnits: ['kg', 'sack'], barcode: '141414141' },
  { id: '16', name: 'Apple', nameAr: 'تفاح', price: 12, baseUnit: 'kg', allowedUnits: ['kg', 'gram', 'piece'], barcode: '151515151' },
  { id: '17', name: 'Cheese', nameAr: 'جبنة', price: 20, baseUnit: 'piece', allowedUnits: ['piece', 'kg', 'gram'], barcode: '161616161' },
  { id: '18', name: 'Paper Towel', nameAr: 'مناديل مطبخ', price: 10, baseUnit: 'roll', allowedUnits: ['roll', 'bundle'], barcode: '171717171' },
  { id: '19', name: 'Toilet Paper', nameAr: 'ورق حمام', price: 15, baseUnit: 'roll', allowedUnits: ['roll', 'packet', 'bundle'], barcode: '181818181' },
  { id: '20', name: 'Laundry Detergent', nameAr: 'مسحوق غسيل', price: 22, baseUnit: 'kg', allowedUnits: ['kg', 'packet', 'sack'], barcode: '191919191' },
];
