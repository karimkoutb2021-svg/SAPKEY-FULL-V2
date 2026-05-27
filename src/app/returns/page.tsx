'use client';

import { useRouter } from 'next/navigation';
import { RotateCcw, Shield, Clock, MessageCircle, ArrowRight, Home } from 'lucide-react';
import { useBrandingStore } from '@/lib/store/branding-store';
import { PageHeader } from '@/components/layout/page-header';
import { Footer } from '@/components/layout/footer';
import Link from 'next/link';

export default function ReturnsPage() {
  const router = useRouter();
  const { branding } = useBrandingStore();
  const primaryColor = branding.primaryColor || '#22C55E';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617]" dir="rtl">
      <PageHeader title="سياسة الإرجاع والاستبدال" subtitle="حقوقك كاملة كمشتري" icon={<RotateCcw className="h-8 w-8" />} />

      <div className="max-w-4xl mx-auto px-4 py-2">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium">
          <Home className="h-4 w-4" /> العودة للرئيسية
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">شروط الإرجاع</h2>
          <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start gap-2"><Clock className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-500" /> يمكن إرجاع المنتج خلال 24 ساعة من تاريخ الاستلام</li>
            <li className="flex items-start gap-2"><Shield className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-500" /> المنتج لازم يكون في حالته الأصلية وغير مستخدم</li>
            <li className="flex items-start gap-2"><Shield className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-500" /> المنتجات الغذائية المنتهية الصلاحية يتم استبدالها فوراً</li>
            <li className="flex items-start gap-2"><Shield className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-500" /> يتم استرداد المبلغ كاملاً على المحفظة أو نفس طريقة الدفع</li>
          </ul>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">كيف ترجع منتج؟</h2>
          <div className="space-y-4">
            {[
              { step: '1', title: 'تواصل معنا', desc: 'اتصل بخدمة العملاء أو ابعت واتساب برقم الطلب' },
              { step: '2', title: 'تأكيد الإرجاع', desc: 'هنأكد معاك تفاصيل الطلب وسبب الإرجاع' },
              { step: '3', title: 'استلام المنتج', desc: 'السائق هيجي ياخد المنتج من عندك في نفس يوم التوصيل' },
              { step: '4', title: 'استرداد المبلغ', desc: 'المبلغ هيرجع لمحفظتك خلال 24 ساعة' },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4">
                <div className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ backgroundColor: primaryColor }}>{item.step}</div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">{item.title}</h3>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6 text-center">
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">محتاج ترجع طلب؟</h3>
          <div className="flex gap-3 justify-center flex-wrap mt-4">
            <button onClick={() => router.push('/orders')} className="h-10 px-5 rounded-xl text-sm font-bold text-white flex items-center gap-2" style={{ backgroundColor: primaryColor }}>
              <ArrowRight className="h-4 w-4" /> طلباتي
            </button>
            <button onClick={() => window.open(`https://wa.me/${branding.whatsapp || '201000000000'}`, '_blank')} className="h-10 px-5 rounded-xl text-sm font-bold bg-green-500 text-white flex items-center gap-2">
              <MessageCircle className="h-4 w-4" /> واتساب
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
