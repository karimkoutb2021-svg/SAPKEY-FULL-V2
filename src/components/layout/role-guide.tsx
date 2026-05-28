'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/lib/store/auth-store';
import { ROLES } from '@/types';
import { Book, X } from 'lucide-react';
import { DynamicInfographic } from '@/components/guides/dynamic-infographic';

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
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/60 backdrop-blur-md z-50" onClick={() => setShow(false)} />
            <motion.div initial={{opacity:0, scale:0.95, y:20}} animate={{opacity:1, scale:1, y:0}} exit={{opacity:0, scale:0.95, y:20}} className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10 pointer-events-none">
              <div className="bg-[#fbfbfd] rounded-[3rem] w-full max-w-5xl h-full max-h-[90vh] shadow-[0_40px_100px_rgba(0,0,0,0.3)] overflow-hidden relative pointer-events-auto flex flex-col">
                <button onClick={() => setShow(false)} className="absolute top-6 left-6 z-50 w-12 h-12 bg-black/10 hover:bg-black/20 backdrop-blur-md rounded-full flex items-center justify-center transition-all duration-300">
                  <X className="h-6 w-6 text-[#1d1d1f]" />
                </button>
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  <DynamicInfographic role={user.role} />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
