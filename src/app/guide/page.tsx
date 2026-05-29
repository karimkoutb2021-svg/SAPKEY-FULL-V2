'use client';

import { PageTransition } from '@/components/ui/page-transition';
import { BookOpen, ShieldCheck, ClipboardCheck, Code, Users } from 'lucide-react';
import Link from 'next/link';

export default function GuidePage() {
  return (
    <PageTransition className="min-h-screen bg-gray-50 dark:bg-[#0f172a] text-gray-900 dark:text-white p-6 sm:p-10">
      <div dir="rtl" className="max-w-5xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-4 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full mb-4">
            <BookOpen className="w-10 h-10" />
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-gray-900 dark:text-white">دليل الاستخدام الشامل</h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-lg">
            دليلك الشامل لمعرفة جميع ميزات النظام، بدءاً من التكويد والجرد إلى صلاحيات المستخدمين.
          </p>
        </div>

        {/* Section 1: Coding & Auditing */}
        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-3xl p-6 sm:p-10 shadow-lg overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <ClipboardCheck className="w-32 h-32" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-bold">
                <Code className="w-4 h-4" /> القسم الأول
              </div>
              <h2 className="text-2xl sm:text-3xl font-black">التكويد والجرد الآلي</h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg">
                تعرف على كيفية تكويد المنتجات الجديدة، إدخال الباركود، وبدء جلسات الجرد سواء يدوياً أو عن طريق الباركود والصوت.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  إضافة منتجات فردية أو عن طريق ملف Excel.
                </li>
                <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  بدء جلسة الجرد والتحقق من الكميات الفعلية ومطابقتها.
                </li>
                <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  استخدام المساعد الصوتي والمسح الضوئي لتسريع الجرد.
                </li>
              </ul>
            </div>
            <div className="w-full md:w-1/2 flex-shrink-0">
              <img loading="lazy" src="/guide/coding_audit_infographic.png" 
                alt="انفوجرافيك التكويد والجرد" 
                className="w-full h-auto rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Cashier Permissions */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-900/20 border border-emerald-100 dark:border-emerald-500/10 rounded-3xl p-6 sm:p-10 shadow-lg overflow-hidden relative">
          <div className="absolute top-0 left-0 p-8 opacity-5">
            <ShieldCheck className="w-32 h-32" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row-reverse gap-8 items-center">
            <div className="flex-1 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-200 dark:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-sm font-bold">
                <Users className="w-4 h-4" /> القسم الثاني
              </div>
              <h2 className="text-2xl sm:text-3xl font-black">صلاحيات الكاشير وإدارة الورديات</h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg">
                يتمتع الكاشير بصلاحيات محددة لضمان سير العمل بسلاسة، مع إمكانية استخدام أجزاء من لوحة التحكم بالاشتراك مع المدير.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  الدخول لصفحة التكويد لإضافة وتعديل المنتجات.
                </li>
                <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  إدارة جلسات الجرد والمشاركة في مطابقة الكميات.
                </li>
                <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  البيع عبر نقطة البيع (POS) وإدارة الدرج والمرتجعات.
                </li>
              </ul>
            </div>
            <div className="w-full md:w-1/2 flex-shrink-0">
              <img loading="lazy" src="/guide/cashier_permissions_infographic.png" 
                alt="انفوجرافيك صلاحيات الكاشير" 
                className="w-full h-auto rounded-2xl shadow-2xl border border-white/50 dark:border-white/10 hover:-translate-y-2 transition-transform duration-500"
              />
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center pt-8">
          <Link href="/">
            <button className="px-8 py-4 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-xl">
              العودة إلى الرئيسية
            </button>
          </Link>
        </div>
      </div>
    </PageTransition>
  );
}

