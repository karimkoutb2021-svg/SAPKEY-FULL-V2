import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient<any, any>;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return _supabase;
}

const DEFAULT_GUIDES: Record<string, any> = {
  cashier: {
    title: 'دليل الكاشير',
    titleEn: 'Cashier Guide',
    version: '2.0.0',
    lastUpdated: new Date().toISOString(),
    sections: [
      { id: 'welcome', title: 'مرحبًا بك', content: 'أهلاً بك في نظام نقطة البيع. هذا الدليل يساعدك على استخدام النظام بكفاءة.', order: 0 },
      { id: 'login', title: 'تسجيل الدخول', content: 'ادخل بريدك الإلكتروني وكلمة المرور التي أعطاها لك المدير. بعد الدخول هيتم نقلك لصفحة تغيير كلمة المرور.', order: 1 },
      { id: 'pos', title: 'نقطة البيع', content: 'امسح الباركود أو ابحث عن المنتج وأضفه للسلة. اختر طريقة الدفع (كاش/بطاقة/محفظة) وأتمم البيع.', order: 2 },
      { id: 'returns', title: 'المرتجعات', content: 'من قائمة المرتجعات ابحث عن الفاتورة واختر المنتجات المرتجعة.', order: 3 },
      { id: 'profile', title: 'الملف الشخصي', content: 'من أيقونة المستخدم فوق تقدر تغير بياناتك وكلمة المرور.', order: 4 },
    ],
  },
  customer: {
    title: 'دليل العميل',
    titleEn: 'Customer Guide',
    version: '2.0.0',
    lastUpdated: new Date().toISOString(),
    sections: [
      { id: 'welcome', title: 'مرحبًا بك', content: 'أهلاً بك في متجرنا الإلكتروني. تقدر تتصفح المنتجات وتطلب أونلاين.', order: 0 },
      { id: 'browse', title: 'تصفح المنتجات', content: 'استخدم البحث أو الأقسام للعثور على المنتجات. أضف المنتجات للسلة.', order: 1 },
      { id: 'order', title: 'إتمام الطلب', content: 'من السلة راجع طلبك واختر طريقة الدفع. هيتم إرسال الطلب عبر واتساب.', order: 2 },
      { id: 'account', title: 'حسابي', content: 'من صفحة حسابي تقدر تعدل بياناتك، تشوف طلباتك، المحفظة، ونقاط الولاء.', order: 3 },
      { id: 'wallet', title: 'المحفظة', content: 'تقدر تشحن رصيدك من الكاشير أو تستخدم كود تحويل.', order: 4 },
    ],
  },
  manager: {
    title: 'دليل المدير',
    titleEn: 'Manager Guide',
    version: '2.0.0',
    lastUpdated: new Date().toISOString(),
    sections: [
      { id: 'welcome', title: 'مرحبًا بك', content: 'أهلاً بك في لوحة تحكم المدير. من هنا تقدر تدير المتجر بالكامل.', order: 0 },
      { id: 'dashboard', title: 'لوحة التحكم', content: 'شوف المبيعات، الطلبات، والمخزون من نظرة واحدة.', order: 1 },
      { id: 'users', title: 'إدارة المستخدمين', content: 'من /admin/users تقدر تنشئ حسابات كاشير وعملاء وتعيد تعيين كلمات المرور.', order: 2 },
      { id: 'products', title: 'المنتجات', content: 'أضف وعدّل المنتجات والأسعار والمخزون.', order: 3 },
      { id: 'reports', title: 'التقارير', content: 'استعرض تقارير المبيعات والأرباح والمخزون.', order: 4 },
    ],
  },
  developer: {
    title: 'دليل المطور',
    titleEn: 'Developer Guide',
    version: '2.0.0',
    lastUpdated: new Date().toISOString(),
    sections: [
      { id: 'welcome', title: 'مرحبًا بك', content: 'أهلاً بك في لوحة المطور. من هنا تقدر تتحكم في كل إعدادات النظام.', order: 0 },
      { id: 'branding', title: 'العلامة التجارية', content: 'غيّر اللوجو، الألوان، الأيقونات، واسم المتجر من /admin/branding.', order: 1 },
      { id: 'tenants', title: 'المستأجرين', content: 'أدر حسابات العملاء والباقات والاشتراكات.', order: 2 },
      { id: 'features', title: 'الميزات', content: 'فعّل أو عطّل أي ميزة في النظام.', order: 3 },
      { id: 'backup', title: 'النسخ الاحتياطي', content: 'صدّر واستورد بيانات النظام.', order: 4 },
    ],
  },
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role');

  if (role) {
    const { data, error } = await getSupabase()
      .from('guide_content')
      .select('*')
      .eq('role', role)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ success: true, guide: DEFAULT_GUIDES[role] || null });
    }
    return NextResponse.json({ success: true, guide: data.content });
  }

  const { data, error } = await getSupabase()
    .from('guide_content')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    const guides: Record<string, any> = {};
    for (const [key, value] of Object.entries(DEFAULT_GUIDES)) {
      guides[key] = value;
    }
    return NextResponse.json({ success: true, guides });
  }

  const guides: Record<string, any> = {};
  for (const row of data || []) {
    guides[row.role] = row.content;
  }
  for (const [key, value] of Object.entries(DEFAULT_GUIDES)) {
    if (!guides[key]) guides[key] = value;
  }

  return NextResponse.json({ success: true, guides });
}

export async function POST(req: NextRequest) {
  try {
    const { role, content } = await req.json();
    if (!role || !content) {
      return NextResponse.json({ error: 'role و content مطلوبان' }, { status: 400 });
    }

    const { data: existing } = await getSupabase()
      .from('guide_content')
      .select('id')
      .eq('role', role)
      .maybeSingle();

    if (existing) {
      await getSupabase()
        .from('guide_content')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('role', role);
    } else {
      await getSupabase()
        .from('guide_content')
        .insert({ role, content, updated_at: new Date().toISOString() });
    }

    return NextResponse.json({ success: true, message: 'تم حفظ الدليل' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'فشل الحفظ' }, { status: 500 });
  }
}
