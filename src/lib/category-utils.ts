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

export async function loadCategories(): Promise<ProductCategory[]> {
  if (cachedCategories) return cachedCategories;
  const result = await categoryService.getAll({ is_active: true });
  cachedCategories = result.data || [];
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
