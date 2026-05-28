'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileDown, Share2, Mail, Download, ArrowRight, Printer } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DynamicInfographic } from '@/components/guides/dynamic-infographic';
import html2pdf from 'html2pdf.js';
import toast from 'react-hot-toast';

export default function GuideExportPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState('cashier');
  const [isExporting, setIsExporting] = useState(false);

  const roles = [
    { id: 'admin', name: 'المدير العام' },
    { id: 'manager', name: 'المدير' },
    { id: 'cashier', name: 'الكاشير' },
    { id: 'developer', name: 'المطور' },
    { id: 'customer', name: 'العميل' },
  ];

  const handleExportPDF = async () => {
    setIsExporting(true);
    toast.loading('جاري تجهيز الكتيب...', { id: 'pdf-toast' });
    
    try {
      const element = pdfRef.current;
      if (!element) throw new Error('لا يمكن العثور على الدليل');

      const opt = {
        margin: 10,
        filename: `guide-${selectedRole}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
      toast.success('تم تصدير الدليل بنجاح', { id: 'pdf-toast' });
    } catch (e) {
      console.error(e);
      toast.error('حدث خطأ أثناء التصدير', { id: 'pdf-toast' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`مرحباً بك! يمكنك تحميل دليل ${roles.find(r=>r.id===selectedRole)?.name} من هنا:`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleEmail = () => {
    const text = encodeURIComponent(`مرحباً بك! يمكنك تحميل دليل ${roles.find(r=>r.id===selectedRole)?.name} من هنا:`);
    window.open(`mailto:?subject=دليل المستخدم&body=${text}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/admin')} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors">
              <ArrowRight className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">مركز تصدير الأدلة</h1>
              <p className="text-sm text-gray-500">خاص بالمطور: تصدير ومشاركة الأدلة التفاعلية</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <select 
              value={selectedRole} 
              onChange={e => setSelectedRole(e.target.value)}
              className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm font-bold rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Actions Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 space-y-3">
              <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase">خيارات التصدير</h3>
              
              <button onClick={handleExportPDF} disabled={isExporting} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-rose-600 hover:opacity-90 text-white p-3 rounded-xl font-bold transition-all disabled:opacity-50">
                <FileDown className="w-5 h-5" />
                {isExporting ? 'جاري التصدير...' : 'تصدير PDF'}
              </button>
              
              <button onClick={handleWhatsApp} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:opacity-90 text-white p-3 rounded-xl font-bold transition-all">
                <Share2 className="w-5 h-5" /> مشاركة WhatsApp
              </button>
              
              <button onClick={handleEmail} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:opacity-90 text-white p-3 rounded-xl font-bold transition-all">
                <Mail className="w-5 h-5" /> إرسال بريد
              </button>
              
              <button onClick={() => window.print()} className="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-800 dark:text-white p-3 rounded-xl font-bold transition-all">
                <Printer className="w-5 h-5" /> طباعة فورية
              </button>
            </div>
          </div>

          {/* Preview Area */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-gray-200/50 dark:border-slate-700/50 overflow-hidden">
            <div className="bg-gray-100 dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 p-3 flex justify-center">
              <span className="text-xs font-bold text-gray-500">المعاينة الحية للطباعة</span>
            </div>
            <div className="h-[750px] overflow-y-auto overflow-x-hidden bg-white scrollbar-hide">
              <div className="transform scale-90 origin-top">
                <DynamicInfographic role={selectedRole} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
