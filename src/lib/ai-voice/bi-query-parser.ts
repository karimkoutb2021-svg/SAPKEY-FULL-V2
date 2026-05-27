import { normalizeArabic } from '@/lib/arabic-normalize';

export interface BIQuery {
  intent: 'treasury_balance' | 'profit_summary' | 'expense_summary' | 'top_product' | 'low_stock' | 'pending_orders' | 'unknown';
  dateRange: 'today' | 'week' | 'month' | 'custom';
  dateMonth?: number;
  dateYear?: number;
  entity?: string;
  walletType?: string;
}

const treasuryKeywords = ['خزينة', 'خزينه', 'محفظة', 'محفظه', 'رصيد', 'حسابات', 'حساب', 'فاتورة', 'فودافون', 'انستا', 'بنك'];
const profitKeywords = ['أرباح', 'ربح', 'مبيعات', 'بيع', 'دخل', 'إيرادات', 'وارد', 'صافي'];
const expenseKeywords = ['مصروفات', 'مصروف', 'نثريات', 'صرف', 'منصرف', 'عهدة'];
const productKeywords = ['منتج', 'صنف', 'مبيعاً', 'مبيع', 'طلبات'];
const stockKeywords = ['مخزون', 'ناقص', 'قليل', 'منخفض', 'less'];
const pendingKeywords = ['معلق', 'معلقة', 'pending'];

const monthMap: Record<string, number> = {
  يناير: 1, فبراير: 2, مارس: 3, أبريل: 4, مايو: 5, يونيو: 6,
  يوليو: 7, أغسطس: 8, سبتمبر: 9, أكتوبر: 10, نوفمبر: 11, ديسمبر: 12,
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};

function extractDateRange(text: string): { dateRange: BIQuery['dateRange']; month?: number; year?: number } {
  const t = normalizeArabic(text);
  if (t.includes('النهارده') || t.includes('اليوم') || t.includes('انهارده')) return { dateRange: 'today' };
  if (t.includes('الاسبوع') || t.includes('الأسبوع')) return { dateRange: 'week' };

  for (const [name, num] of Object.entries(monthMap)) {
    if (t.includes(normalizeArabic(name))) {
      const year = new Date().getFullYear();
      return { dateRange: 'month', month: num, year };
    }
  }

  if (t.includes('شهر')) return { dateRange: 'month' };
  return { dateRange: 'month' };
}

function extractEntity(text: string): string | undefined {
  const t = normalizeArabic(text);
  const patterns = [
    /خزينة\s+(.+?)(?:\s|$|؟)/,
    /حسابات\s+(.+?)(?:\s|$|؟)/,
    /محفظة\s+(.+?)(?:\s|$|؟)/,
    /المنتج\s+(.+?)(?:\s|$|؟)/,
    /منتج\s+(.+?)(?:\s|$|؟)/,
  ];
  for (const p of patterns) {
    const m = t.match(p);
    if (m) return m[1].trim();
  }
  return undefined;
}

function hasTopProductIntent(text: string): boolean {
  const t = normalizeArabic(text);
  return t.includes('المبيع') || t.includes('اعلى') || t.includes('أعلى') || t.includes('اكثر');
}

export function parseBIQuery(text: string): BIQuery {
  const t = normalizeArabic(text);

  const dateInfo = extractDateRange(text);

  // Check top product first (it's a specific sub-intent)
  if (hasTopProductIntent(t) && (t.includes('منتج') || t.includes('صنف') || t.includes('مبيع'))) {
    return { intent: 'top_product', ...dateInfo };
  }

  // Count keyword matches for each intent
  const treasuryScore = treasuryKeywords.filter(k => t.includes(normalizeArabic(k))).length;
  const profitScore = profitKeywords.filter(k => t.includes(normalizeArabic(k))).length;
  const expenseScore = expenseKeywords.filter(k => t.includes(normalizeArabic(k))).length;
  const productScore = productKeywords.filter(k => t.includes(normalizeArabic(k))).length;
  const stockScore = stockKeywords.filter(k => t.includes(normalizeArabic(k))).length;
  const pendingScore = pendingKeywords.filter(k => t.includes(normalizeArabic(k))).length;

  // Determine intent by highest score
  const scores = [
    { intent: 'treasury_balance' as const, score: treasuryScore },
    { intent: 'profit_summary' as const, score: profitScore },
    { intent: 'expense_summary' as const, score: expenseScore },
    { intent: 'top_product' as const, score: productScore },
    { intent: 'low_stock' as const, score: stockScore },
    { intent: 'pending_orders' as const, score: pendingScore },
  ];

  scores.sort((a, b) => b.score - a.score);

  if (scores[0].score > 0) {
    return {
      intent: scores[0].intent,
      ...dateInfo,
      entity: extractEntity(text),
    };
  }

  return { intent: 'unknown', dateRange: 'today' };
}

export function getIntentLabel(intent: BIQuery['intent']): string {
  const labels: Record<string, string> = {
    treasury_balance: 'الخزينة والحسابات',
    profit_summary: 'الأرباح والمبيعات',
    expense_summary: 'المصروفات والنثريات',
    top_product: 'المنتجات الأكثر مبيعاً',
    low_stock: 'المخزون المنخفض',
    pending_orders: 'الطلبات المعلقة',
    unknown: 'استفسار عام',
  };
  return labels[intent] || 'استفسار عام';
}
