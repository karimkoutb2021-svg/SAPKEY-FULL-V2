import { normalizeArabic } from '@/lib/arabic-normalize';

export interface VoiceCommand {
  keywords: string[];
  action: string;
  description: string;
}

const EGYPTIAN_ARABIC_MAP: Record<string, string> = {
  'ارزو': 'ارز',
  'ارز': 'ارز',
  'ارزى': 'ارز',
  'اروز': 'ارز',
  'جبنة': 'جبنة',
  'جبنه': 'جبنة',
  'جبن': 'جبنة',
  'جبنا': 'جبنة',
  'لبن': 'لبن',
  'لبنه': 'لبن',
  'حليب': 'لبن',
  'مكرونه': 'مكرونة',
  'مكرونة': 'مكرونة',
  'مكرونا': 'مكرونة',
  'سكّر': 'سكر',
  'سكر': 'سكر',
  'زيت': 'زيت',
  'زيتون': 'زيتون',
  'شاي': 'شاي',
  'شاى': 'شاي',
  'بيبسى': 'بيبسي',
  'بيبسي': 'بيبسي',
  'كوكاكولا': 'كوكاكولا',
  'كوكا': 'كوكاكولا',
  'ميه': 'مياه',
  'مياة': 'مياه',
  'مياه': 'مياه',
  'مايه': 'مياه',
  'شيبسى': 'شيبسي',
  'شيبسي': 'شيبسي',
  'شيبس': 'شيبسي',
  'تونه': 'تونة',
  'تونة': 'تونة',
  'فول': 'فول',
  'فلافل': 'فول',
  'صلصه': 'صلصة',
  'صلصة': 'صلصة',
  'صَلصة': 'صلصة',
  'سمن': 'سمن',
  'سمنه': 'سمن',
  'زبده': 'زبدة',
  'زبدة': 'زبدة',
  'بانيه': 'بانيه',
  'برجر': 'برجر',
  'برقر': 'برجر',
  'ناجتس': 'ناجتس',
  'سجق': 'سجق',
  'لانشون': 'لانشون',
  'زبادى': 'زبادي',
  'زبادي': 'زبادي',
  'روب': 'زبادي',
  'رايب': 'رايب',
  'قشطه': 'قشطة',
  'قشطة': 'قشطة',
  'مناديل': 'مناديل',
  'صابون': 'صابون',
  'شامبو': 'شامبو',
  'معجون': 'معجون',
  'كلوركس': 'كلوركس',
  'برسيل': 'برسيل',
  'اريال': 'إريال',
  'إريال': 'إريال',
};

const VOICE_COMMANDS: VoiceCommand[] = [
  { keywords: ['ضيف', 'أضف', 'اضف', 'حط', 'حطي', 'هات'], action: 'add_to_cart', description: 'أضف منتج للعربة' },
  { keywords: ['اتمام', 'إتمام', 'تمام', 'checkout', 'اطلب', 'أطلب'], action: 'checkout', description: 'إتمام عملية الشراء' },
  { keywords: ['امسح', 'إمسح', 'شيل', 'احذف', 'حذف', 'remove'], action: 'clear_cart', description: 'مسح العربة' },
  { keywords: ['بحث', 'ابحث', 'دور', 'دوري', 'search'], action: 'search', description: 'بحث عن منتج' },
  { keywords: ['رجوع', 'ارجع', 'back', 'وراء'], action: 'go_back', description: 'الرجوع للخلف' },
  { keywords: ['الرئيسية', 'الرئيسيه', 'home', 'بيت'], action: 'go_home', description: 'الصفحة الرئيسية' },
  { keywords: ['نقطة البيع', 'بى او اس', 'pos', 'كاشير'], action: 'open_pos', description: 'فتح نقطة البيع' },
  { keywords: ['المخزون', 'مخزون', 'inventory'], action: 'open_inventory', description: 'فتح المخزون' },
  { keywords: ['الطلبات', 'طلبات', 'orders'], action: 'open_orders', description: 'فتح الطلبات' },
  { keywords: ['زيادة', 'زيد', 'اضافة', 'أضف'], action: 'increase_qty', description: 'زيادة الكمية' },
  { keywords: ['نقص', 'نقصان', 'قلل', 'انقص'], action: 'decrease_qty', description: 'تقليل الكمية' },
  { keywords: ['كام', 'كم', 'السعر', 'سعر', 'price'], action: 'get_price', description: 'سعر المنتج' },
];

function fuzzyMatch(searchTerm: string, target: string): number {
  const normalizedSearch = normalizeArabic(searchTerm);
  const normalizedTarget = normalizeArabic(target);

  // Direct match
  if (normalizedTarget === normalizedSearch) return 1;

  // Contains match
  if (normalizedTarget.includes(normalizedSearch)) return 0.9;
  if (normalizedSearch.includes(normalizedTarget)) return 0.85;

  // Egyptian Arabic mapping
  const mappedSearch = EGYPTIAN_ARABIC_MAP[normalizedSearch];
  if (mappedSearch && normalizeArabic(mappedSearch) === normalizedTarget) return 0.95;

  const mappedTarget = EGYPTIAN_ARABIC_MAP[normalizedTarget];
  if (mappedTarget && normalizeArabic(mappedTarget) === normalizedSearch) return 0.95;

  // Check if mapped version contains
  if (mappedSearch && normalizedTarget.includes(normalizeArabic(mappedSearch))) return 0.8;
  if (mappedTarget && normalizedSearch.includes(normalizeArabic(mappedTarget))) return 0.8;

  // Partial word match - split into words
  const searchWords = normalizedSearch.split(' ');
  const targetWords = normalizedTarget.split(' ');

  let matchCount = 0;
  for (const sw of searchWords) {
    for (const tw of targetWords) {
      if (tw.includes(sw) || sw.includes(tw)) {
        matchCount++;
        break;
      }
      // Check Egyptian mapping for each word
      const mappedSw = EGYPTIAN_ARABIC_MAP[sw];
      if (mappedSw && (tw.includes(normalizeArabic(mappedSw)) || normalizeArabic(mappedSw).includes(tw))) {
        matchCount++;
        break;
      }
    }
  }

  if (matchCount > 0) return (matchCount / searchWords.length) * 0.7;

  // Levenshtein distance for close matches
  const len1 = normalizedSearch.length;
  const len2 = normalizedTarget.length;
  if (Math.abs(len1 - len2) > 3) return 0;

  const matrix: number[][] = [];
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = normalizedSearch[i - 1] === normalizedTarget[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  const similarity = 1 - distance / maxLen;

  return similarity > 0.6 ? similarity * 0.6 : 0;
}

export function findBestMatch(searchTerm: string, items: { name: string; sku?: string; barcode?: string; category?: string }[]): { item: typeof items[0]; score: number } | null {
  const normalizedSearch = normalizeArabic(searchTerm);
  let bestMatch: { item: typeof items[0]; score: number } | null = null;

  for (const item of items) {
    let maxScore = 0;

    // Match against name
    const nameScore = fuzzyMatch(normalizedSearch, item.name);
    maxScore = Math.max(maxScore, nameScore);

    // Match against SKU
    if (item.sku) {
      const skuScore = item.sku.toLowerCase().includes(normalizedSearch) ? 0.95 : 0;
      maxScore = Math.max(maxScore, skuScore);
    }

    // Match against barcode
    if (item.barcode && item.barcode.includes(normalizedSearch)) {
      maxScore = Math.max(maxScore, 0.95);
    }

    // Match against category
    if (item.category) {
      const catScore = fuzzyMatch(normalizedSearch, item.category);
      maxScore = Math.max(maxScore, catScore * 0.8);
    }

    if (maxScore > 0.4 && (!bestMatch || maxScore > bestMatch.score)) {
      bestMatch = { item, score: maxScore };
    }
  }

  return bestMatch;
}

export function detectVoiceCommand(transcript: string): { command: VoiceCommand | null; productQuery?: string; quantity?: number } {
  const normalized = normalizeArabic(transcript);
  const words = normalized.split(' ');

  // Extract numbers (Egyptian Arabic)
  const numberMap: Record<string, number> = {
    'واحد': 1, 'اتنين': 2, 'تلاتة': 3, 'أربعة': 4, 'خمسة': 5,
    'ستة': 6, 'سبعة': 7, 'تمنية': 8, 'تسعة': 9, 'عشرة': 10,
    'اتناشر': 12, 'تلتاشر': 13, 'اربعتاشر': 14, 'خمستاشر': 15,
    'عشرين': 20, 'تلاتين': 30, 'اربعتين': 40, 'خمسين': 50,
    'مية': 100, 'الف': 1000,
    'نص': 0.5, 'ربع': 0.25,
  };

  let quantity = 1;
  let productQuery = normalized;

  // Try to extract quantity
  for (const word of words) {
    if (numberMap[word]) {
      quantity = numberMap[word];
      productQuery = productQuery.replace(word, '').trim();
    }
    // Also check for digits
    const digitMatch = word.match(/\d+/);
    if (digitMatch) {
      quantity = parseInt(digitMatch[0], 10);
      productQuery = productQuery.replace(digitMatch[0], '').trim();
    }
  }

  // Detect command
  for (const cmd of VOICE_COMMANDS) {
    for (const keyword of cmd.keywords) {
      const normalizedKeyword = normalizeArabic(keyword);
      if (normalized.includes(normalizedKeyword)) {
        // Remove command keyword from product query
        productQuery = productQuery.replace(normalizedKeyword, '').trim();
        return { command: cmd, productQuery: productQuery || undefined, quantity };
      }
    }
  }

  // No command detected, treat as search
  return { command: null, productQuery: normalized, quantity };
}

export function createVoiceRecognition(options: {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}): { start: () => void; stop: () => void; isSupported: boolean } {
  const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;

  if (!SpeechRecognition) {
    return {
      start: () => {},
      stop: () => {},
      isSupported: false,
    };
  }

  const recognition = new SpeechRecognition();
  recognition.lang = options.lang || 'ar-EG';
  recognition.continuous = options.continuous || false;
  recognition.interimResults = options.interimResults || false;

  recognition.onresult = (event: any) => {
    let transcript = '';
    let isFinal = false;

    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
      isFinal = event.results[i].isFinal;
    }

    options.onResult?.(transcript, isFinal);
  };

  recognition.onerror = (event: any) => {
    options.onError?.(event.error);
  };

  recognition.onend = () => {
    options.onEnd?.();
  };

  return {
    start: () => recognition.start(),
    stop: () => recognition.stop(),
    isSupported: true,
  };
}
