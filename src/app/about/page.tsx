'use client';

import { useRouter } from 'next/navigation';
import { Store, Target, Users, Award, ArrowRight, Home } from 'lucide-react';
import { useBrandingStore } from '@/lib/store/branding-store';
import { PageHeader } from '@/components/layout/page-header';
import { Footer } from '@/components/layout/footer';
import Link from 'next/link';

export default function AboutPage() {
  const router = useRouter();
  const { branding } = useBrandingStore();
  const primaryColor = branding.primaryColor || '#22C55E';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617]" dir="rtl">
      <PageHeader title="من نحن" subtitle="قصتنا ورؤيتنا" icon={<Store className="h-8 w-8" />} />

      <div className="max-w-4xl mx-auto px-4 py-2">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium">
          <Home className="h-4 w-4" /> العودة للرئيسية
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">عن {branding.storeName || 'SAPKEY'}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {branding.storeName || 'SAPKEY'} هي منصة متكاملة لإدارة المتاجر ونقاط البيع. بدأنا بهدف تبسيط عمليات البيع والتجزئة وتوفير تجربة تسوق سلسة للعملاء. نوفر نظام متكامل يشمل إدارة المخزون، المحاسبة، التوصيل، ونظام ولاء للعملاء.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { icon: <Target className="h-6 w-6" />, title: 'رؤيتنا', desc: 'أن نكون المنصة الأولى لإدارة التجزئة في مصر والشرق الأوسط' },
            { icon: <Users className="h-6 w-6" />, title: 'رسالتنا', desc: 'تمكين أصحاب المتاجر من إدارة أعمالهم بكفاءة وسهولة' },
            { icon: <Award className="h-6 w-6" />, title: 'قيمنا', desc: 'الجودة، الابتكار، خدمة العملاء، والشفافية' },
            { icon: <Store className="h-6 w-6" />, title: 'خدماتنا', desc: 'نظام POS، متجر إلكتروني، توصيل، محاسبة، وإدارة مخزون' },
          ].map((item, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${primaryColor}15` }}>
                <span style={{ color: primaryColor }}>{item.icon}</span>
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">{item.title}</h3>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button onClick={() => router.push('/shop')} className="h-12 px-8 rounded-xl text-white font-bold flex items-center gap-2 mx-auto" style={{ backgroundColor: primaryColor }}>
            <ArrowRight className="h-4 w-4" /> تسوق الآن
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
