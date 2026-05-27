'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/lib/store/auth-store';
import { ROLES } from '@/types';
import { Book, X } from 'lucide-react';

const GUIDES: Record<string, { title: string; steps: string[] }> = {
  admin: {
    title: 'دليل مدير النظام',
    steps: [
      'التحكم الكامل في النظام وجميع الصلاحيات',
      'إدارة الموظفين: إضافة، تعديل، حذف، صلاحيات',
      'الإعدادات: تغيير العلامة التجارية، الألوان، الشعار',
      'التقارير: جميع التقارير المالية والمخزنية',
      'المحاسبة: قيود اليومية، المصروفات، الخزينة',
      'المشتريات: إدارة الموردين، فواتير الشراء',
      'المبيعات: تقارير المبيعات، تحليلات الأرباح',
    ],
  },
  manager: {
    title: 'دليل المدير',
    steps: [
      'الإشراف على العمليات اليومية',
      'إدارة المنتجات والمخزون والمستودعات',
      'متابعة الطلبات والتوصيل',
      'الصلاحيات: إدارة الموظفين (قراءة)',
      'التقارير: تقارير المبيعات والمخزون',
      'العملاء: إدارة قاعدة العملاء',
      'نقطة البيع: صلاحية الخصم والبيع',
    ],
  },
  accountant: {
    title: 'دليل المحاسب',
    steps: [
      'النظام المحاسبي: قيود اليومية (مدين/دائن)',
      'المصروفات: تسجيل جميع المصروفات',
      'الخزينة: إدارة النقد والصندوق',
      'البنوك: متابعة الحسابات البنكية',
      'الضرائب: إدارة ضريبة القيمة المضافة',
      'التقارير: قائمة الدخل، الميزانية، التدفقات',
      'الرواتب: إدارة رواتب الموظفين',
    ],
  },
  cashier: {
    title: 'دليل الكاشير',
    steps: [
      'نقطة البيع (POS): بيع المنتجات للعملاء',
      'إضافة المنتجات: بالباركود، البحث، أو اللمس',
      'إدخال الوزن: للمنتجات الموزونة (كجم/جرام)',
      'اختيار الوحدة: كرتونة، قطعة، باكيت...',
      'طرق الدفع: نقداً، بطاقة، محفظة',
      'طباعة الفاتورة: PDF أو مشاركة واتساب',
      'المرتجعات: إرجاع المنتجات',
    ],
  },
  warehouse: {
    title: 'دليل أمين المخزن',
    steps: [
      'إدارة المخزون: متابعة الكميات',
      'المستودعات: إدارة مخازن متعددة',
      'حركة المخزون: واردة، صادرة، تحويلات',
      'الصلاحية: متابعة تواريخ انتهاء الصلاحية',
      'الباتشات: تتبع أرقام التشغيلات',
      'الجرد: عمل جرد دوري للمخزون',
      'التقارير: تقارير المخزون والمستويات',
    ],
  },
  delivery: {
    title: 'دليل مندوب التوصيل',
    steps: [
      'لوحة المندوب: عرض الطلبات الموكلة إليك',
      'تحديث الحالة: تم التحميل → في الطريق → تم التوصيل',
      'إثبات التوصيل: تصوير المنتج + توقيع العميل',
      'التواصل: الاتصال بالعميل من التطبيق',
      'الخريطة: معرفة موقع التوصيل',
      'الإشعارات: تنبيهات الطلبات الجديدة',
    ],
  },
  supplier: {
    title: 'دليل المورد',
    steps: [
      'بوابة المورد: عرض المنتجات الموردة',
      'طلبات التوريد: متابعة أوامر الشراء',
      'الفواتير: عرض فواتير التوريد',
      'المخزون: معرفة الكميات المطلوبة',
    ],
  },
  customer: {
    title: 'دليل العميل',
    steps: [
      'المتجر: تصفح وشراء المنتجات',
      'البحث: بالاسم أو الصوت',
      'الفلترة: حسب الفئة أو السعر',
      'الطلب: إضافة للسلة ← إتمام الطلب',
      'الدفع: الدفع عند الاستلام (COD)',
      'واتساب: استلام الفاتورة عبر واتساب',
      'تتبع الطلب: متابعة حالة الطلب',
    ],
  },
  sales: {
    title: 'دليل موظف المبيعات',
    steps: [
      'المبيعات: إتمام عمليات البيع للعملاء',
      'العملاء: إضافة وتعديل بيانات العملاء',
      'المنتجات: عرض الأسعار والمخزون',
      'نقطة البيع: صلاحية بيع محدودة',
    ],
  },
};

export function RoleGuideButton() {
  const { user } = useAuthStore();
  const [show, setShow] = useState(false);
  if (!user) return null;
  const guide = GUIDES[user.role] || GUIDES['customer'];

  return (
    <>
      <button onClick={() => setShow(true)} className="h-8 px-2 rounded-lg hover:bg-accent flex items-center gap-1 text-xs text-muted-foreground" title="دليل المستخدم">
        <Book className="h-3.5 w-3.5" /> دليل
      </button>

      <AnimatePresence>
        {show && (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/50 z-50" onClick={() => setShow(false)} />
            <motion.div initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.9}} className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShow(false)}>
              <div className="bg-white dark:bg-[#0F172A] rounded-3xl p-6 max-w-sm w-full shadow-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} dir="rtl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">{guide.title}</h2>
                  <button onClick={() => setShow(false)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800"><X className="h-5 w-5 text-gray-400" /></button>
                </div>
                <div className="space-y-3">
                  {guide.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-[#22C55E]/10 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-[#22C55E]">{i + 1}</span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
