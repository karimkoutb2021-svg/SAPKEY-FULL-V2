'use client';

import toast from 'react-hot-toast';

/**
 * Demo mode handler - shows working notification for any action
 * Used in dashboard pages for buttons that don't have real backend
 */
export function demoAction(message: string, success: boolean = true) {
  if (success) {
    toast.success(message, { duration: 2000 });
  } else {
    toast.error(message, { duration: 2000 });
  }
}

export function demoModal(title: string) {
  toast.custom(
    (t) => (
      <div className="bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 max-w-sm w-full" dir="rtl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={() => toast.dismiss(t.id)} className="text-gray-400 hover:text-gray-600 text-sm">إغلاق</button>
        </div>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
          هذه واجهة تجريبية. في النسخة الكاملة، سيتم فتح نموذج إدخال هنا.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button className="h-10 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 transition-all">إلغاء</button>
          <button onClick={() => { toast.dismiss(t.id); demoAction('تم بنجاح!'); }} className="h-10 rounded-xl bg-[#22C55E] text-white text-sm font-medium hover:bg-[#16A34A] transition-all">حفظ</button>
        </div>
      </div>
    ),
    { duration: 5000 }
  );
}
