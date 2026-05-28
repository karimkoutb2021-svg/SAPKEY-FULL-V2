import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const supabase = await createClient();

    const { data: categories } = await supabase.from('product_categories').select('*');
    const { data: products } = await supabase.from('products').select('*');

    const result = products?.map(p => {
      const cat = categories?.find(c => c.id === p.category_id);
      return {
        name: p.name_ar,
        category: cat?.name_ar,
        category_id: p.category_id
      };
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
