'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, ChevronDown, Phone, MessageCircle, Home } from 'lucide-react';
import { useBrandingStore } from '@/lib/store/branding-store';
import { PageHeader } from '@/components/layout/page-header';
import { Footer } from '@/components/layout/footer';
import Link from 'next/link';

const faqCategories = [
  {
    title: 'الطلبات والتوصيل',
    questions: [
      { q: 'كيف أطلب من المتجر؟', a: 'يمكنك الطلب مباشرة من صفحة المتجر، أضف المنتجات للسلة ثم أكمل الطلب. الدفع عند الاستلام أو بالدفع الإلكتروني.' },
      { q: 'كم يستغرق التوصيل؟', a: 'التوصيل يستغرق حوالي 45 دقيقة من تأكيد الطلب. يتم إرسال إشعار لك عند خروج الطلب.' },
      { q: 'هل يوجد حد أدنى للطلب؟', a: 'لا يوجد حد أدنى للطلب. يمكنك طلب أي كمية.' },
      { q: 'كيف أتتبع طلبي؟', a: 'بعد تأكيد الطلب، ستحصل على رابط تتبع يمكنك من متابعة حالة الطلب لحظة بلحظة.' },
    ],
  },
  {
    title: 'الدفع والمحفظه',
    questions: [
      { q: 'ما طرق الدفع المتاحة؟', a: 'نقبل الدفع النقدي عند الاستلام، بطاقات الائتمان/الخصم، وإنستاباي.' },
      { q: 'كيف أشحن محفظتي؟', a: 'يمكنك شحن المحفظة من صفحة المحفظة عبر فيزا أو إنستاباي أو من نقطة البيع.' },
      { q: 'هل المحفظة آمنة؟', a: 'نعم، المحفظة مشفرة ومؤمنة بالكامل. لا يمكن لأي شخص الوصول لها غيرك.' },
    ],
  },
  {
    title: 'نقاط الولاء',
    questions: [
      { q: 'كيف أكسب نقاط ولاء؟', a: 'مع كل طلب تكسب نقاط بناءً على قيمة الطلب. كل 10 جنيه = 1 نقطة.' },
      { q: 'كيف أستبدل النقاط؟', a: 'يمكنك استبدال النقاط بكوبونات خصم من صفحة نقاط الولاء.' },
      { q: 'هل النقاط تنتهي؟', a: 'النقاط صالحة لمدة سنة من تاريخ اكتسابها.' },
    ],
  },
  {
    title: 'الإرجاع والاستبدال',
    questions: [
      { q: 'هل يمكنني إرجاع منتج؟', a: 'نعم، يمكنك إرجاع المنتج خلال 24 ساعة من الاستلام إذا كان في حالته الأصلية.' },
      { q: 'كيف أبلغ عن مشكلة في الطلب؟', a: 'تواصل معنا عبر صفحة الاتصال أو واتساب وسنحل المشكلة فوراً.' },
    ],
  },
];

export default function FAQPage() {
  const router = useRouter();
  const { branding } = useBrandingStore();
  const primaryColor = branding.primaryColor || '#22C55E';
  const [openIndex, setOpenIndex] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617]" dir="rtl">
      <PageHeader title="الأسئلة الشائعة" subtitle="إجابات على أكثر الأسئلة اللي بتوصلنا" icon={<Search className="h-8 w-8" />} />

      <div className="max-w-4xl mx-auto px-4 py-2">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium">
          <Home className="h-4 w-4" /> العودة للرئيسية
        </Link>
      </div>

      {/* FAQ Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {faqCategories.map((cat, ci) => (
          <div key={ci} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
            <h3 className="px-5 py-4 font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-800">{cat.title}</h3>
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {cat.questions.map((item, qi) => {
                const key = `${ci}-${qi}`;
                const isOpen = openIndex === key;
                return (
                  <div key={qi}>
                    <button onClick={() => setOpenIndex(isOpen ? null : key)} className="w-full flex items-center justify-between px-5 py-4 text-right">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.q}</span>
                      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="px-5 pb-4">
                        <p className="text-sm text-gray-500 leading-relaxed">{item.a}</p>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Still need help */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6 text-center">
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">محتاج مساعدة أكتر؟</h3>
          <p className="text-sm text-gray-500 mb-4">فريق خدمة العملاء متاح 24/7</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={() => router.push('/contact')} className="h-10 px-5 rounded-xl text-sm font-bold text-white flex items-center gap-2" style={{ backgroundColor: primaryColor }}>
              <Phone className="h-4 w-4" /> اتصل بنا
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
