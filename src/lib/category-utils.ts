import { categoryService, type ProductCategory } from '@/lib/supabase/services/categories';

export interface CategoryLink {
  id: string;
  nameAr: string;
  nameEn: string;
  href: string;
}

export const CATEGORY_KEYS = {
  beverages: 'المشروبات',
  dairy: 'الألبان',
} as const;

let cachedCategories: ProductCategory[] | null = null;

const CATEGORY_IMAGE_MAP: Record<string, string> = {
  'المشروبات': '/categories/cat_beverages_1779892243061.png',
  'الألبان': '/categories/cat_dairy_1779892227755.png',
  'وجبات خفيفة': '/categories/cat_snacks_1779892258838.png',
  'مواد معلبة': '/categories/cat_canned_1779892290215.png',
  'مجمدات': '/categories/cat_frozen_1779892304943.png',
  'مخبوزات': '/categories/cat_bakery_1779892322815.png',
  'منظفات': '/categories/cat_cleaning_1779892344307.png',
  'عناية شخصية': '/categories/cat_personal_care_1779892360769.png',
  'توابل وبهارات': '/categories/cat_spices_1779892374718.png',
  'زيوت وسمن': '/categories/cat_oils_1779892398753.png',
  'مكرونة وأرز': '/categories/cat_pasta_1779892413682.png',
  'حلويات وشوكولاتة': '/categories/cat_sweets_1779892428543.png',
  'خضروات طازجة': '/categories/cat_vegetables_1779892457162.png',
  'فواكه طازجة': '/categories/cat_fruits_1779892472203.png',
  'لحوم ودواجن': '/categories/cat_meat_1779892486030.png',
  'أسماك ومأكولات بحرية': '/categories/cat_seafood_1779892508582.png',
  'إفطار وحبوب': '/categories/cat_breakfast_1779892522148.png',
  'ألبان وأجبان': '/categories/cat_dairy_1779892227755.png', // Fallback for alternative naming
};

export async function loadCategories(): Promise<ProductCategory[]> {
  if (cachedCategories) return cachedCategories;
  const result = await categoryService.getAll({ is_active: true });
  
  // Patch images with generated artifacts
  cachedCategories = (result.data || []).map(cat => ({
    ...cat,
    image_url: CATEGORY_IMAGE_MAP[cat.name_ar] || cat.image_url || '/category-placeholder.svg'
  }));
  
  return cachedCategories;
}

export function findCategoryId(nameOrKey: string, categories: ProductCategory[]): string | null {
  const found = categories.find(
    c => c.name_ar === nameOrKey || c.name_en?.toLowerCase() === nameOrKey.toLowerCase() || c.slug?.toLowerCase() === nameOrKey.toLowerCase()
  );
  return found?.id || null;
}

export function getCategoryHref(nameOrKey: string, categories: ProductCategory[]): string {
  const id = findCategoryId(nameOrKey, categories);
  return id ? `/shop?category=${id}` : '/shop';
}

export function buildCategoryLinks(categories: ProductCategory[]): CategoryLink[] {
  return [
    {
      id: findCategoryId(CATEGORY_KEYS.beverages, categories) || 'all',
      nameAr: CATEGORY_KEYS.beverages,
      nameEn: 'beverages',
      href: `/shop?category=${findCategoryId(CATEGORY_KEYS.beverages, categories) || 'all'}`,
    },
    {
      id: findCategoryId(CATEGORY_KEYS.dairy, categories) || 'all',
      nameAr: CATEGORY_KEYS.dairy,
      nameEn: 'dairy',
      href: `/shop?category=${findCategoryId(CATEGORY_KEYS.dairy, categories) || 'all'}`,
    },
  ];
}
