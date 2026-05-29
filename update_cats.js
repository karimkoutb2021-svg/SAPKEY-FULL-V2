const SUPABASE_URL = 'https://cshpnhzhzahnpvfflsgx.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const catImages = {
  'المخبوزات': '/images/categories/cat_bakery_1779892322815.png',
  'المشروبات': '/images/categories/cat_beverages_1779892243061.png',
  'الإفطار': '/images/categories/cat_breakfast_1779892522148.png',
  'المعلبات': '/images/categories/cat_canned_1779892290215.png',
  'المنظفات': '/images/categories/cat_cleaning_1779892344307.png',
  'الألبان والأجبان': '/images/categories/cat_dairy_1779892227755.png',
  'المجمدات': '/images/categories/cat_frozen_1779892304943.png',
  'الفواكه': '/images/categories/cat_fruits_1779892472203.png',
  'اللحوم والدواجن': '/images/categories/cat_meat_1779892486030.png',
  'الزيوت والسمن': '/images/categories/cat_oils_1779892398753.png',
  'المكرونة والأرز': '/images/categories/cat_pasta_1779892413682.png',
  'العناية الشخصية': '/images/categories/cat_personal_care_1779892360769.png',
  'الأسماك': '/images/categories/cat_seafood_1779892508582.png',
  'التسالي': '/images/categories/cat_snacks_1779892258838.png',
  'البهارات والعطارة': '/images/categories/cat_spices_1779892374718.png',
  'الحلويات': '/images/categories/cat_sweets_1779892428543.png',
  'الخضروات': '/images/categories/cat_vegetables_1779892457162.png'
};

async function main() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/product_categories?select=*`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  const categories = await res.json();
  console.log('Found', categories.length, 'categories');

  for (const cat of categories) {
    let matchedImage = null;
    const name = cat.name_ar;

    if (name.includes('حلويات') || name.includes('شوكولاتة')) matchedImage = catImages['الحلويات'];
    else if (name.includes('خضروات')) matchedImage = catImages['الخضروات'];
    else if (name.includes('فواكه')) matchedImage = catImages['الفواكه'];
    else if (name.includes('لحوم') || name.includes('دواجن')) matchedImage = catImages['اللحوم والدواجن'];
    else if (name.includes('أسماك') || name.includes('بحرية')) matchedImage = catImages['الأسماك'];
    else if (name.includes('إفطار')) matchedImage = catImages['الإفطار'];
    else if (name.includes('أطفال')) matchedImage = catImages['العناية الشخصية'];
    else if (name.includes('حيوانات')) matchedImage = catImages['العناية الشخصية'];
    else if (name.includes('ألبان') || name.includes('أجبان')) matchedImage = catImages['الألبان والأجبان'];
    else if (name.includes('مشروبات')) matchedImage = catImages['المشروبات'];
    else if (name.includes('مكرونة') || name.includes('أرز')) matchedImage = catImages['المكرونة والأرز'];
    else if (name.includes('زيوت') || name.includes('سمن')) matchedImage = catImages['الزيوت والسمن'];
    else if (name.includes('معلب') || name.includes('مواد معلبة')) matchedImage = catImages['المعلبات'];
    else if (name.includes('مجمدات')) matchedImage = catImages['المجمدات'];
    else if (name.includes('مخبوزات')) matchedImage = catImages['المخبوزات'];
    else if (name.includes('وجبات خفيفة') || name.includes('تسالي')) matchedImage = catImages['التسالي'];
    else if (name.includes('عناية شخصية')) matchedImage = catImages['العناية الشخصية'];
    else if (name.includes('منظفات')) matchedImage = catImages['المنظفات'];
    else if (name.includes('توابل') || name.includes('بهارات') || name.includes('عطارة')) matchedImage = catImages['البهارات والعطارة'];

    if (matchedImage) {
      console.log(`Updating ${cat.name_ar} to ${matchedImage}`);
      await fetch(`${SUPABASE_URL}/rest/v1/product_categories?id=eq.${cat.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image_url: matchedImage })
      });
    } else {
      console.log(`No match for ${cat.name_ar}`);
    }
  }
}

main();
