import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizeArabic } from '@/lib/arabic-normalize';

const EGYPTIAN_ARABIC_MAP: Record<string, string> = {
  'ارزو': 'ارز', 'ارزى': 'ارز', 'اروز': 'ارز',
  'جبنه': 'جبنة', 'جبنا': 'جبنة',
  'لبنه': 'لبن',
  'مكرونه': 'مكرونة', 'مكرونا': 'مكرونة',
  'سكّر': 'سكر',
  'شاى': 'شاي',
  'بيبسى': 'بيبسي',
  'ميه': 'مياه', 'مايه': 'مياه', 'مياة': 'مياه',
  'شيبسى': 'شيبسي', 'شيبس': 'شيبسي',
  'تونه': 'تونة',
  'صلصه': 'صلصة',
  'سمنه': 'سمن',
  'زبده': 'زبدة',
  'زبادى': 'زبادي',
  'قشطه': 'قشطة',
  'برقر': 'برجر',
};

function isWordMatch(search: string, text: string): boolean {
  const words = text.split(/\s+/);
  return words.some(w => w === search || (search.length >= 2 && w.includes(search)) || w.startsWith(search));
}

function scoreProduct(normalizedQ: string, product: { name_ar: string; name: string; category?: string }): number {
  const nameArNorm = normalizeArabic(product.name_ar);
  const nameNorm = normalizeArabic(product.name);

  if (nameArNorm === normalizedQ || nameNorm === normalizedQ) return 1;
  if (isWordMatch(normalizedQ, nameArNorm) || isWordMatch(normalizedQ, nameNorm)) return 0.95;

  const mappedQ = EGYPTIAN_ARABIC_MAP[normalizedQ];
  if (mappedQ) {
    const mappedNorm = normalizeArabic(mappedQ);
    if (isWordMatch(mappedNorm, nameArNorm) || isWordMatch(mappedNorm, nameNorm)) return 0.9;
  }

  const searchWords = normalizedQ.split(/\s+/);
  const nameWords = [...new Set([...nameArNorm.split(/\s+/), ...nameNorm.split(/\s+/)])];
  let matchCount = 0;
  for (const sw of searchWords) {
    if (sw.length < 2) continue;
    for (const nw of nameWords) {
      if (nw === sw || nw.startsWith(sw) || (sw.length >= 2 && nw.includes(sw))) { matchCount++; break; }
    }
  }

  if (matchCount > 0 && searchWords.length > 0) {
    const ratio = matchCount / searchWords.length;
    if (ratio >= 0.5) return 0.8 * ratio;
  }

  return 0;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const categoryId = searchParams.get('category') || '';
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

  if (!q.trim()) {
    return NextResponse.json({ products: [], suggestions: [], totalCount: 0 });
  }

  const supabase = await createClient();
  const normalizedQ = normalizeArabic(q.trim());

  let query = supabase.from('products').select('*, product_categories!inner(name_ar)').eq('is_active', true).limit(200);

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data: products, error } = await query;

  if (error) {
    return NextResponse.json({ products: [], suggestions: [], totalCount: 0, error: error.message }, { status: 500 });
  }

  const scored = (products || []).map((p) => ({
    ...p,
    score: scoreProduct(normalizedQ, p),
  })).filter((p) => p.score > 0.4)
   .sort((a, b) => b.score - a.score)
   .slice(0, limit);

  const suggestions = scored.slice(0, 5).map((p) => p.name_ar);

  return NextResponse.json({
    products: scored.map(({ score, product_categories, ...p }) => ({
      ...p,
      category: product_categories?.name_ar || '',
    })),
    suggestions,
    totalCount: scored.length,
  });
}
