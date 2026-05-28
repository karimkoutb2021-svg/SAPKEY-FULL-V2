import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getNavItemsForRole } from '@/lib/permissions';
import * as Icons from 'lucide-react';
import type { UserRole } from '@/types';

const ROLE_INFO: Record<string, { title: string; subtitle: string; color: string }> = {
  developer: {
    title: 'دليل المطور',
    subtitle: 'التحكم الكامل في بنية النظام، قواعد البيانات، والخوادم',
    color: 'from-zinc-900 to-zinc-700',
  },
  admin: {
    title: 'دليل مدير النظام',
    subtitle: 'الإشراف الكامل على المنشأة، الأرباح، وإدارة الفروع',
    color: 'from-blue-700 to-indigo-900',
  },
  manager: {
    title: 'دليل المدير',
    subtitle: 'إدارة العمليات اليومية، المخزون، والمنتجات',
    color: 'from-emerald-600 to-teal-800',
  },
  cashier: {
    title: 'دليل الكاشير',
    subtitle: 'نقطة البيع، خدمة العملاء، وإصدار الفواتير',
    color: 'from-orange-500 to-red-600',
  },
  customer: {
    title: 'دليل العميل',
    subtitle: 'التسوق الذكي، متابعة الطلبات، والمحفظة',
    color: 'from-violet-600 to-purple-800',
  }
};

export function DynamicInfographic({ role = 'customer' }: { role?: string }) {
  const info = ROLE_INFO[role] || ROLE_INFO['customer'];
  
  // Dynamic features generated from actual allowed routes
  const allowedNavs = getNavItemsForRole(role as UserRole);
  
  const features = allowedNavs.map(nav => {
    const Icon = (Icons as any)[nav.icon as string] || Icons.Circle;
    return {
      title: nav.titleAr,
      desc: `إمكانية الوصول إلى ${nav.titleAr} (${nav.title})`,
      icon: Icon,
      color: `text-${info.color.split(' ')[0].replace('from-', '')}`
    };
  });

  return (
    <div className="w-full h-full bg-[#fbfbfd] text-[#1d1d1f] font-sans" dir="rtl" id="printable-guide">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-black text-white py-24 md:py-32 px-6 rounded-b-[3rem] shadow-2xl flex flex-col items-center text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: 'easeOut' }} className="z-10 max-w-4xl">
          <h1 className={cn("text-5xl md:text-7xl font-black tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r", info.color)}>
            {info.title}
          </h1>
          <p className="text-xl md:text-3xl font-medium text-gray-300 leading-relaxed max-w-3xl mx-auto">
            {info.subtitle}
          </p>
        </motion.div>
      </div>

      {/* Grid Features dynamically generated */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-[#1d1d1f] mb-4">صلاحياتك الحية من النظام</h2>
          <p className="text-lg md:text-xl text-gray-500 font-medium">تم استخراج هذه الصلاحيات تلقائياً وبشكل حي بناءً على إعدادات حسابك.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {features.map((feat, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: idx * 0.05, ease: 'easeOut' }}
              className="bg-white p-6 rounded-3xl shadow-sm hover:shadow-xl border border-gray-100 transition-all duration-300"
            >
              <div className="mb-4">
                <feat.icon className={cn("w-10 h-10", feat.color)} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold mb-2 text-[#1d1d1f]">{feat.title}</h3>
              <p className="text-[#86868b] text-sm font-medium">{feat.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
      
      <div className="bg-[#f5f5f7] py-8 text-center border-t border-gray-200">
        <p className="text-[#86868b] text-sm font-medium">هذا الدليل ديناميكي - أي تغيير في صلاحيات النظام سينعكس هنا تلقائياً.</p>
      </div>
    </div>
  );
}
