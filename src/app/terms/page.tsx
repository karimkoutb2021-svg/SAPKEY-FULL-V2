'use client';

import { FileText, CheckCircle, AlertTriangle, Scale, Home } from 'lucide-react';
import { useBrandingStore } from '@/lib/store/branding-store';
import { PageHeader } from '@/components/layout/page-header';
import { Footer } from '@/components/layout/footer';
import Link from 'next/link';

export default function TermsPage() {
  const { branding } = useBrandingStore();
  const primaryColor = branding.primaryColor || '#22C55E';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617]" dir="rtl">
      <PageHeader title="الشروط والأحكام" subtitle="القوانين اللي بتنظم استخدامك للمنصة" icon={<FileText className="h-8 w-8" />} />

      <div className="max-w-4xl mx-auto px-4 py-2">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium">
          <Home className="h-4 w-4" /> العودة للرئيسية
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {[
          { icon: <CheckCircle className="h-5 w-5" />, title: '1. استخدام المنصة', content: 'باستخدامك لمنصة {storeName} فإنك توافق على هذه الشروط والأحكام. يجب أن تكون 18 سنة على الأقل لاستخدام خدماتنا.' },
          { icon: <CheckCircle className="h-5 w-5" />, title: '2. الحساب والتسجيل', content: 'أنت مسؤول عن الحفاظ على سرية بيانات حسابك. أي نشاط يتم من خلال حسابك يعتبر من مسؤوليتك.' },
          { icon: <CheckCircle className="h-5 w-5" />, title: '3. الطلبات والدفع', content: 'جميع الأسعار بالجنيه المصري. الدفع عند الاستلام أو إلكترونياً. نحتفظ بحق إلغاء أي طلب في حالة عدم توفر المنتج.' },
          { icon: <AlertTriangle className="h-5 w-5" />, title: '4. الإرجاع والاستبدال', content: 'يمكن إرجاع المنتجات خلال 24 ساعة من الاستلام بشرط أن تكون في حالتها الأصلية. المنتجات التالفة أو المنتهية الصلاحية يتم استبدالها فوراً.' },
          { icon: <Scale className="h-5 w-5" />, title: '5. المسؤولية', content: 'لا نتحمل مسؤولية أي تأخير في التوصيل بسبب ظروف خارجة عن إرادتنا. نلتزم بتعويضك عن أي منتج تالف أو غير مطابق.' },
          { icon: <Scale className="h-5 w-5" />, title: '6. التعديلات', content: 'نحتفظ بحق تعديل هذه الشروط في أي وقت. سيتم إشعارك بأي تغييرات جوهرية.' },
        ].map((section, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6">
            <div className="flex items-center gap-3 mb-3">
              <span style={{ color: primaryColor }}>{section.icon}</span>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{section.title}</h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {section.content.replace('{storeName}', branding.storeName || 'SAPKEY')}
            </p>
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
