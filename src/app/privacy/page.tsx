'use client';

import { Shield, Eye, Lock, Database, UserCheck, Home } from 'lucide-react';
import { useBrandingStore } from '@/lib/store/branding-store';
import { PageHeader } from '@/components/layout/page-header';
import { Footer } from '@/components/layout/footer';
import Link from 'next/link';

export default function PrivacyPage() {
  const { branding } = useBrandingStore();
  const primaryColor = branding.primaryColor || '#22C55E';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617]" dir="rtl">
      <PageHeader title="سياسة الخصوصية" subtitle="كيف نحمي بياناتك" icon={<Shield className="h-8 w-8" />} />

      <div className="max-w-4xl mx-auto px-4 py-2">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium">
          <Home className="h-4 w-4" /> العودة للرئيسية
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {[
          { icon: <Eye className="h-5 w-5" />, title: 'البيانات اللي بنجمعها', items: ['الاسم ورقم الهاتف عند التسجيل', 'عنوان التوصيل', 'بيانات الطلبات والسجل الشرائي', 'بيانات الجهاز والمتصفح لتحسين التجربة'] },
          { icon: <Lock className="h-5 w-5" />, title: 'إزاي نحمي بياناتك', items: ['تشفير كامل لجميع البيانات', 'اتصال آمن HTTPS', 'صلاحيات محدودة للموظفين', 'نسخ احتياطية مشفرة'] },
          { icon: <Database className="h-5 w-5" />, title: 'استخدام البيانات', items: ['معالجة الطلبات والتوصيل', 'تحسين تجربة التسوق', 'إرسال عروض وخصومات (اختياري)', 'تحليل البيانات لتحسين الخدمة'] },
          { icon: <UserCheck className="h-5 w-5" />, title: 'حقوقك', items: ['طلب حذف بياناتك في أي وقت', 'تعديل بياناتك الشخصية', 'الانسحاب من القائمة البريدية', 'الاستفسار عن البيانات المحفوظة'] },
        ].map((section, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${primaryColor}15` }}>
                <span style={{ color: primaryColor }}>{section.icon}</span>
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{section.title}</h2>
            </div>
            <ul className="space-y-2">
              {section.items.map((item, j) => (
                <li key={j} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="h-1.5 w-1.5 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: primaryColor }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="text-center text-xs text-gray-400">
          <p>آخر تحديث: مايو 2026</p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
