'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, DatabaseZap, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/store/auth-store';
import toast from 'react-hot-toast';

export default function DeveloperPage() {
  const { userRole } = useAuthStore();
  const [loading, setLoading] = useState(false);

  // التأكد من أن المستخدم أدمن أو مطور
  if (userRole !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500 font-bold" dir="rtl">
        عفواً، هذه الصفحة مخصصة للمطور فقط.
      </div>
    );
  }

  const handleFactoryReset = async () => {
    if (!confirm('تحذير شديد: هل أنت متأكد من مسح جميع بيانات الحركات والمبيعات والمخازن والبدء من جديد كنسخة فارغة؟ (المنتجات والقوائم لن تمسح)')) return;
    if (!confirm('تأكيد نهائي: هذه العملية لا يمكن التراجع عنها. استمرار؟')) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/developer/reset', { method: 'POST' });
      if (!res.ok) throw new Error('فشل مسح البيانات');
      toast.success('تم ضبط المصنع بنجاح. النظام الآن جاهز كنسخة فارغة.');
      setTimeout(() => window.location.reload(), 2000);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreDemoData = async () => {
    if (!confirm('هل أنت متأكد من استعادة البيانات التجريبية؟ سيتم مسح أي بيانات حركات حالية وإضافة بيانات جديدة للفواتير والمخازن.')) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/developer/seed', { method: 'POST' });
      if (!res.ok) throw new Error('فشل استعادة البيانات التجريبية');
      toast.success('تمت استعادة البيانات التجريبية بنجاح عبر كامل النظام.');
      setTimeout(() => window.location.reload(), 2000);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-8" dir="rtl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/20">
          <DatabaseZap className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">أدوات المطور</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            إدارة قاعدة البيانات والنظام (للمطور فقط)
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Factory Reset */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-red-200 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5 shadow-sm overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center shrink-0">
                  <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                    ضبط المصنع (نسخة فارغة للعميل)
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                    هذا الزر سيقوم بمسح جميع حركات المبيعات، الفواتير، المرتجعات، حركات المخازن، الحسابات، وتقارير الورديات بشكل كامل. سيجعل النظام وكأنه يبدأ لأول مرة.
                    <br/><br/>
                    <strong className="text-red-500 text-xs">ملاحظة: المنتجات، الأقسام، شجرة الحسابات، والإعدادات ستبقى كما هي بدون تغيير.</strong>
                  </p>
                  <Button 
                    onClick={handleFactoryReset} 
                    disabled={loading}
                    className="mt-6 w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white border-0 shadow-lg shadow-red-600/20 font-bold"
                  >
                    {loading ? 'جارٍ المعالجة...' : 'تأكيد مسح الحركات والبدء من جديد'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Restore Demo Data */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5 shadow-sm overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <DatabaseZap className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    استعادة البيانات التجريبية (للعرض والتجربة)
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                    سيقوم هذا الزر بتوليد وإضافة بيانات تجريبية ضخمة تظهر في كل أقسام النظام (أرصدة مخازن حقيقية، فواتير كثيرة، حركات مالية، تقارير بيع متكاملة).
                    <br/><br/>
                    <strong className="text-emerald-500 text-xs">مفيد لعرض إمكانيات النظام وقوة التقارير لعميل محتمل.</strong>
                  </p>
                  <Button 
                    onClick={handleRestoreDemoData}
                    disabled={loading}
                    className="mt-6 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-lg shadow-emerald-600/20 font-bold"
                  >
                    {loading ? 'جارٍ المعالجة...' : 'توليد واستعادة البيانات التجريبية'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

    </div>
  );
}
