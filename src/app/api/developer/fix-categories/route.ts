import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // Fetch all categories
    const { data: categories, error: catError } = await supabase.from('product_categories').select('*');
    if (catError || !categories) throw new Error('Failed to fetch categories');

    // Create a mapping of category names to their IDs
    const categoryMap: Record<string, string> = {};
    const keywordsMap: Record<string, string[]> = {};

    categories.forEach(c => {
      categoryMap[c.name_en] = c.id;
      categoryMap[c.name_ar] = c.id;
    });

    // Define keywords for each logical category
    const rules = [
      {
        categoryNames: ['ألبان وأجبان', 'Dairy', 'Dairy & Eggs', 'الالبان والاجبان', 'ألبان'],
        keywords: ['جبن', 'جبنة', 'لبن', 'حليب', 'زبادي', 'زبدة', 'قشطة', 'فيت', 'طعمة', 'دومتي', 'جهينة', 'المراعي', 'موزاريلا', 'رومي', 'شيدر']
      },
      {
        categoryNames: ['مشروبات', 'Beverages', 'المشروبات'],
        keywords: ['عصير', 'شاي', 'قهوة', 'نسكافيه', 'بيبسي', 'كوكاكولا', 'مياه', 'معدنية', 'مشروب', 'سفن اب', 'ميرندا', 'سبرايت']
      },
      {
        categoryNames: ['زيوت وسمن', 'Oils & Ghee', 'الزيوت والسمن', 'زيوت'],
        keywords: ['زيت', 'سمن', 'عافية', 'كريستال', 'قلية', 'روابي', 'زيتون']
      },
      {
        categoryNames: ['بقوليات', 'Legumes', 'البقوليات', 'بقوليات وحبوب'],
        keywords: ['فول', 'عدس', 'فاصوليا', 'لوبيا', 'حمص', 'ترمس']
      },
      {
        categoryNames: ['معلبات', 'Canned Foods', 'المعلبات'],
        keywords: ['تونة', 'صلصة', 'فول مدمس', 'ذرة', 'مشروم', 'اناناس']
      },
      {
        categoryNames: ['منظفات', 'Cleaning', 'المنظفات', 'عناية منزلية'],
        keywords: ['برسيل', 'اريال', 'تايد', 'كلور', 'ديتول', 'صابون', 'فيري', 'بريل', 'مسحوق']
      },
      {
        categoryNames: ['مخبوزات', 'Bakery', 'المخبوزات', 'مخبوزات وحلويات'],
        keywords: ['خبز', 'عيش', 'فينو', 'باتيه', 'كرواسون', 'كيك', 'بسكويت']
      }
    ];

    // Fetch all products
    const { data: products, error: prodError } = await supabase.from('products').select('*');
    if (prodError || !products) throw new Error('Failed to fetch products');

    let updatedCount = 0;

    for (const product of products) {
      const name = (product.name_ar + ' ' + (product.name_en || '')).toLowerCase();
      let matchedCategoryId = null;

      // Find matching category based on rules
      for (const rule of rules) {
        // Find if the DB has this category
        const cat = categories.find(c => rule.categoryNames.includes(c.name_ar) || rule.categoryNames.includes(c.name_en));
        if (cat) {
          // Check if product name contains any of the keywords
          const isMatch = rule.keywords.some(kw => name.includes(kw.toLowerCase()));
          if (isMatch) {
            matchedCategoryId = cat.id;
            break;
          }
        }
      }

      if (matchedCategoryId && product.category_id !== matchedCategoryId) {
        await supabase.from('products').update({ category_id: matchedCategoryId }).eq('id', product.id);
        updatedCount++;
      }
    }

    return NextResponse.json({ success: true, message: `Fixed ${updatedCount} products into correct categories.` });
  } catch (error: any) {
    console.error('Fix categories error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
