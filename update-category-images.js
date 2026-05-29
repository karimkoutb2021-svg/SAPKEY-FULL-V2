const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL || 'https://cshpnhzhzahnpvfflsgx.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY);

const categoryImages = {
  'اللحوم والدواجن': 'https://images.unsplash.com/photo-1607623814075-e51df1bd682f?auto=format&fit=crop&w=800&q=80',
  'البقالة': 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
  'الخضروات والفواكه': 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=800&q=80',
  'المخبوزات': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
  'المشروبات': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80',
  'الألبان والأجبان': 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=800&q=80',
  'العناية الشخصية': 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=800&q=80',
  'المنظفات': 'https://images.unsplash.com/photo-1584820927498-cafe4c107dc6?auto=format&fit=crop&w=800&q=80',
  'الوجبات الخفيفة': 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&w=800&q=80',
  'الأطعمة المجمدة': 'https://images.unsplash.com/photo-1588964895597-cfccd6e2e0d9?auto=format&fit=crop&w=800&q=80',
};

async function run() {
  const { data: categories } = await supabase.from('product_categories').select('*');
  for (const cat of categories) {
    let img = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80';
    for (const key of Object.keys(categoryImages)) {
      if (cat.name_ar && cat.name_ar.includes(key)) {
        img = categoryImages[key];
        break;
      }
    }
    await supabase.from('product_categories').update({ image_url: img }).eq('id', cat.id);
  }
  console.log('Categories updated!');
}
run();
