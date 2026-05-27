'use client';

// ==============================
// ARABIC NUMBER WORDS TO DIGITS
// ==============================
const arabicNumbers: Record<string, number> = {
  واحد: 1, واحدة: 1, اتنين: 2, اثنين: 2, اثنان: 2,
  ثلاثة: 3, تلاتة: 3, ثلاث: 3, تلات: 3,
  أربعة: 4, اربعة: 4, أربع: 4, اربع: 4,
  خمسة: 5, خمس: 5,
  ستة: 6, ست: 6, سته: 6,
  سبعة: 7, سبع: 7,
  ثمانية: 8, ثمان: 8, تمانية: 8,
  تسعة: 9, تسع: 9,
  عشرة: 10, عشر: 10,
  عشرين: 20, ثلاثين: 30, تلاتين: 30,
  أربعين: 40, خمسين: 50, ستين: 60,
  مية: 100, مائة: 100, مئة: 100,
};

const weightKeywords = ['كيلو', 'جرام', 'كجم', 'كيلوجرام', 'نصف', 'ربع', 'ثلث', 'وزن'];
const quantityWords = ['زجاجة', 'علبة', 'حبة', 'كرتونة', 'كيس', 'ربطة', 'صندوق', 'قطعة', 'حزمة', 'باكيت', 'دستة'];

// ==============================
// ARABIC TEXT NORMALIZATION
// ==============================
function normalizeArabic(text: string): string {
  return text
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[\u064B-\u065F]/g, '') // Remove diacritics (tashkeel)
    .replace(/\s+/g, ' ')
    .trim();
}

function extractNumber(text: string): { number: number; remaining: string } | null {
  // Direct digit patterns: "3", "12", "5.5", etc.
  const digitMatch = text.match(/^(\d+(?:[\/.]\d+)?)\s*(.*)/);
  if (digitMatch) {
    return { number: parseFloat(digitMatch[1]), remaining: digitMatch[2].trim() };
  }

  // Arabic word numbers: "ثلاثة", "خمسة", etc.
  const wordNumMatch = text.match(new RegExp(`^(${Object.keys(arabicNumbers).join('|')})\\s*(.*)`));
  if (wordNumMatch) {
    return { number: arabicNumbers[wordNumMatch[1]], remaining: wordNumMatch[2].trim() };
  }

  // Half/quarter patterns
  const fractionMatch = text.match(/^(نصف|نص|ربع|ثلث)\s*(.*)/);
  if (fractionMatch) {
    const fractions: Record<string, number> = { نصف: 0.5, نص: 0.5, ربع: 0.25, ثلث: 0.333 };
    return { number: fractions[fractionMatch[1]], remaining: fractionMatch[2].trim() };
  }

  return null;
}

function extractWeight(text: string): { weight: number; unit: string; remaining: string } | null {
  // Pattern: "نصف كيلو", "3 كيلو", "كيلو ونص", "500 جرام"
  const kiloMatch = text.match(/(\d+(?:[\/.]\d+)?)?\s*(كيلو|كجم|كيلوجرام)\s*(ونص|ونصف)?/);
  if (kiloMatch) {
    let weight = kiloMatch[1] ? parseFloat(kiloMatch[1]) : 1;
    if (kiloMatch[3]) weight += 0.5;
    const remaining = text.replace(kiloMatch[0], '').trim();
    return { weight, unit: 'kg', remaining };
  }

  const gramMatch = text.match(/(\d+)\s*(جرام|جم|غرام)/);
  if (gramMatch) {
    return { weight: parseFloat(gramMatch[1]) / 1000, unit: 'kg', remaining: text.replace(gramMatch[0], '').trim() };
  }

  const halfMatch = text.match(/(نصف|نص)\s*(كيلو|كجم|كيلوجرام)?/);
  if (halfMatch) {
    const remaining = text.replace(halfMatch[0], '').trim();
    return { weight: 0.5, unit: 'kg', remaining };
  }

  const quarterMatch = text.match(/(ربع)\s*(كيلو|كجم|كيلوجرام)?/);
  if (quarterMatch) {
    return { weight: 0.25, unit: 'kg', remaining: text.replace(quarterMatch[0], '').trim() };
  }

  return null;
}

// ==============================
// PARSED ORDER ITEM
// ==============================
export interface ParsedOrderItem {
  productName: string;
  quantity: number;
  unit: 'piece' | 'kg';
  weight?: number;
  confidence: number; // 0-1
}

export interface ParsedOrder {
  items: ParsedOrderItem[];
  action: 'add' | 'remove' | 'modify' | 'unknown';
  rawText: string;
  hasWeight: boolean;
  totalItems: number;
}

// ==============================
// PRODUCT DATABASE (for matching)
// ==============================
export interface ProductLookup {
  id: string;
  name: string;
  nameAr: string;
  keywords: string[];
  price: number;
  unit: 'piece' | 'kg';
}

const defaultProducts: ProductLookup[] = [
  { id: '1', name: 'Coca Cola', nameAr: 'كوكاكولا', keywords: ['كوكاكولا', 'كوكا', 'كولا', 'coca', 'cola', 'مشروب غازي'], price: 5, unit: 'piece' },
  { id: '2', name: 'Pepsi', nameAr: 'بيبسي', keywords: ['بيبسي', 'pepsi', 'مشروب غازي'], price: 5, unit: 'piece' },
  { id: '3', name: 'Water 1.5L', nameAr: 'ماء', keywords: ['ماء', 'ماي', 'موية', 'مياه', 'معدنية'], price: 3, unit: 'piece' },
  { id: '4', name: 'Bread', nameAr: 'خبز', keywords: ['خبز', 'عيش', 'خبزة', 'خبز ابيض'], price: 3, unit: 'piece' },
  { id: '5', name: 'Eggs 30pc', nameAr: 'بيض', keywords: ['بيض', 'بيضة', 'بيض مزرعة'], price: 28, unit: 'piece' },
  { id: '6', name: 'Milk', nameAr: 'حليب', keywords: ['حليب', 'لبن', 'حليب كامل الدسم', 'حليب طازج'], price: 12, unit: 'piece' },
  { id: '7', name: 'Yogurt', nameAr: 'زبادي', keywords: ['زبادي', 'روب', 'يوغرت'], price: 8, unit: 'piece' },
  { id: '8', name: 'Rice 5kg', nameAr: 'أرز', keywords: ['أرز', 'رز', 'أرز بسمتي', 'ارز'], price: 35, unit: 'piece' },
  { id: '9', name: 'Sugar', nameAr: 'سكر', keywords: ['سكر', 'سكر ناعم', 'سكر خام'], price: 8, unit: 'piece' },
  { id: '10', name: 'Cooking Oil', nameAr: 'زيت', keywords: ['زيت', 'زيت طبخ', 'زيت نباتي'], price: 25, unit: 'piece' },
  { id: '11', name: 'Pasta', nameAr: 'معكرونة', keywords: ['معكرونة', 'باستا', 'مكرونة', 'شعيرية'], price: 6, unit: 'piece' },
  { id: '12', name: 'Chips', nameAr: 'شبسي', keywords: ['شبسي', 'شيبس', 'شيبسي', 'رقائق', 'مقرمشات'], price: 3, unit: 'piece' },
  { id: '13', name: 'Tomato', nameAr: 'طماطم', keywords: ['طماطم', 'بندورة', 'طماطم طازج'], price: 5, unit: 'kg' },
  { id: '14', name: 'Onion', nameAr: 'بصل', keywords: ['بصل', 'بصلة'], price: 4, unit: 'kg' },
  { id: '15', name: 'Potato', nameAr: 'بطاطس', keywords: ['بطاطس', 'بطاطا', 'بطاطس طازج'], price: 4, unit: 'kg' },
  { id: '16', name: 'Apple', nameAr: 'تفاح', keywords: ['تفاح', 'تفاحة', 'تفاح احمر'], price: 12, unit: 'kg' },
  { id: '17', name: 'Banana', nameAr: 'موز', keywords: ['موز', 'موزة'], price: 8, unit: 'kg' },
  { id: '18', name: 'Cheese', nameAr: 'جبنة', keywords: ['جبنة', 'جبن', 'جبنه', 'جبنة بيضاء'], price: 20, unit: 'piece' },
];

// ==============================
// MAIN PARSER
// ==============================
export function parseVoiceOrder(
  text: string,
  products: ProductLookup[] = defaultProducts
): ParsedOrder {
  const cleaned = text.trim();
  const items: ParsedOrderItem[] = [];

  // Detect action
  let action: ParsedOrder['action'] = 'add';
  const actionMatch = cleaned.match(/^(أضف|ضيف|حط|دير|عطني|جيب|طل|اadd|اضف|اشتر|طلب|ابي|ابغا|اريد)\s*/);
  const removeMatch = cleaned.match(/^(شيل|احذف|مسح|ارفع|ارجع|الغي|إلغاء)\s*/);
  const modifyMatch = cleaned.match(/^(عدل|غير|بدل|زود|قلل|قلل)\s*/);

  if (removeMatch) action = 'remove';
  else if (modifyMatch) action = 'modify';

  // Split by separators: و, ثم, بعدين, فاصلة
  let segments = cleaned
    .replace(/^(أضف|ضيف|حط|دير|عطني|جيب|طل|شيل|احذف|مسح|عدل|غير|بدل|زود|قلل|ابي|ابغا|اريد)\s*/i, '')
    .split(/\s*(و|،|,|ثم|بعدين)\s*/)
    .map((s) => s.trim())
    .filter((s) => s && !['و', '،', ',', 'ثم', 'بعدين'].includes(s));

  if (segments.length === 0) segments = [cleaned];

  for (const segment of segments) {
    const item = parseSingleItem(segment, products);
    if (item) items.push(item);
  }

  return {
    items,
    action,
    rawText: text,
    hasWeight: items.some((i) => i.unit === 'kg'),
    totalItems: items.length,
  };
}

function parseSingleItem(
  segment: string,
  products: ProductLookup[]
): ParsedOrderItem | null {
  let remaining = normalizeArabic(segment.trim());
  if (!remaining) return null;

  let quantity = 1;
  let weight: number | undefined;
  let unit: 'piece' | 'kg' = 'piece';

  // Try to extract weight first
  const weightResult = extractWeight(remaining);
  if (weightResult) {
    weight = weightResult.weight;
    unit = 'kg';
    quantity = 1;
    remaining = weightResult.remaining;
  } else {
    // Try to extract number
    const numResult = extractNumber(remaining);
    if (numResult) {
      quantity = numResult.number;
      remaining = numResult.remaining;
    }
  }

  // Clean up quantity/unit words
  for (const qWord of quantityWords) {
    remaining = remaining.replace(new RegExp(qWord, 'g'), '').trim();
  }

  // Try to find matching product
  const matchedProduct = findProduct(remaining, products);
  if (matchedProduct) {
    return {
      productName: matchedProduct.nameAr,
      quantity,
      unit: matchedProduct.unit,
      weight,
      confidence: 0.85,
    };
  }

  // If no match found but we have text, return as unknown product
  if (remaining.length > 0) {
    return {
      productName: remaining,
      quantity,
      unit,
      weight,
      confidence: 0.3,
    };
  }

  return null;
}

function findProduct(query: string, products: ProductLookup[]): ProductLookup | null {
  const normalized = normalizeArabic(query);

  // Direct match on nameAr or name
  const directMatch = products.find(
    (p) => normalizeArabic(p.nameAr) === normalized || p.name.toLowerCase() === normalized.toLowerCase()
  );
  if (directMatch) return directMatch;

  // Keyword match
  const keywordMatch = products.find((p) =>
    p.keywords.some((k) => {
      const normalizedKeyword = normalizeArabic(k);
      return normalized.includes(normalizedKeyword) || normalizedKeyword.includes(normalized);
    })
  );
  if (keywordMatch) return keywordMatch;

  // Partial match on nameAr (contains)
  const partialMatch = products.find((p) => {
    const normalizedName = normalizeArabic(p.nameAr);
    return normalizedName.includes(normalized) || normalized.includes(normalizedName);
  });
  if (partialMatch) return partialMatch;

  // Fuzzy match (at least 2 characters in common)
  if (normalized.length >= 2) {
    const fuzzyMatch = products.find((p) => {
      const name = normalizeArabic(p.nameAr);
      // Check if any consecutive 2+ chars match
      for (let i = 0; i <= normalized.length - 2; i++) {
        const sub = normalized.substring(i, i + 2);
        if (name.includes(sub)) return true;
      }
      return false;
    });
    return fuzzyMatch || null;
  }

  return null;
}

export function generateConfirmationMessage(order: ParsedOrder): string {
  if (order.items.length === 0) return 'لم أتعرف على أي منتج';

  if (order.action === 'remove') {
    return `تم إزالة ${order.items.map((i) => i.productName).join(' و ')}`;
  }

  const itemTexts = order.items.map((item) => {
    if (item.unit === 'kg' && item.weight) {
      return `${item.weight} كيلو ${item.productName}`;
    }
    return `${item.quantity} ${item.productName}`;
  });

  return `تمت إضافة ${itemTexts.join(' و ')}`;
}

export { defaultProducts };
