import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getNavItemsForRole } from '@/lib/permissions';
import * as Icons from 'lucide-react';
import type { UserRole } from '@/types';

const ROLE_INFO: Record<string, { title: string; subtitle: string; color: string; gradient: string }> = {
  developer: {
    title: 'دليل المطور',
    subtitle: 'التحكم الكامل في بنية النظام، قواعد البيانات، والخوادم',
    color: 'text-zinc-900',
    gradient: 'from-zinc-100 to-zinc-300',
  },
  admin: {
    title: 'دليل مدير النظام',
    subtitle: 'الإشراف الكامل على المنشأة، الأرباح، وإدارة الفروع',
    color: 'text-indigo-900',
    gradient: 'from-blue-50 to-indigo-100',
  },
  manager: {
    title: 'دليل المدير',
    subtitle: 'إدارة العمليات اليومية، المخزون، والمنتجات',
    color: 'text-teal-900',
    gradient: 'from-emerald-50 to-teal-100',
  },
  cashier: {
    title: 'دليل الكاشير',
    subtitle: 'نقطة البيع، خدمة العملاء، وإصدار الفواتير',
    color: 'text-red-900',
    gradient: 'from-orange-50 to-red-100',
  },
  customer: {
    title: 'دليل العميل',
    subtitle: 'التسوق الذكي، متابعة الطلبات، والمحفظة',
    color: 'text-purple-900',
    gradient: 'from-violet-50 to-purple-100',
  }
};

export function DynamicInfographic({ role = 'customer', lang = 'ar' }: { role?: string; lang?: 'ar' | 'en' }) {
  const info = ROLE_INFO[role] || ROLE_INFO['customer'];
  
  // Dynamic features generated from actual allowed routes
  const allowedNavs = getNavItemsForRole(role as UserRole);
  
  const features = allowedNavs.map(nav => {
    const Icon = (Icons as any)[nav.icon as string] || Icons.Circle;
    return {
      title: nav.titleAr,
      desc: `صلاحية الدخول والتحكم الكامل في قسم ${nav.titleAr} (${nav.title}) الخاص بك.`,
      icon: Icon,
    };
  });

  return (
    <div className="w-full min-h-screen bg-[#F5F5F7] text-[#1d1d1f] font-sans overflow-hidden" dir={lang === 'ar' ? 'rtl' : 'ltr'} id="printable-guide">
      {/* Hero Section */}
      <div className={cn("relative overflow-hidden py-24 md:py-32 px-6 bg-gradient-to-br", info.gradient)}>
        <div className="absolute inset-0 bg-white/40 backdrop-blur-3xl" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: 'easeOut' }} className="relative z-10 max-w-4xl mx-auto text-center">
          <h1 className={cn("text-3xl md:text-5xl font-semibold tracking-tight mb-4", info.color)}>
            {info.title}
          </h1>
          <p className="text-base md:text-lg font-medium text-gray-600 leading-relaxed max-w-2xl mx-auto">
            {info.subtitle}
          </p>
        </motion.div>
      </div>

      {/* Dynamic Features Grid (Apple Style Infographic) */}
      <div className="max-w-6xl mx-auto px-6 py-16 -mt-16 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, delay: idx * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
              className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-500 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                <feat.icon className={cn("w-6 h-6", info.color)} strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-[#1d1d1f] tracking-tight">{feat.title}</h3>
              <p className="text-[#86868b] text-sm leading-relaxed">{feat.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
