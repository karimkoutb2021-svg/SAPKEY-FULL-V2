'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Briefcase, ArrowRight, MapPin, Clock, Gift, Home } from 'lucide-react';
import { useBrandingStore } from '@/lib/store/branding-store';
import { Footer } from '@/components/layout/footer';
import Link from 'next/link';

export default function CareersPage() {
  const router = useRouter();
  const { branding } = useBrandingStore();
  const primaryColor = branding.primaryColor || '#22C55E';

  const jobs = [
    { title: 'سائق توصيل', location: 'القاهرة', type: 'دوام كامل', perks: ['راتب تنافسي', 'بونص توصيل', 'تأمين صحي'] },
    { title: 'كاشير', location: 'القاهرة', type: 'دوام كامل / جزئي', perks: ['راتب + عمولة', 'تأمين صحي', 'تدريب'] },
    { title: 'مدير فرع', location: 'القاهرة', type: 'دوام كامل', perks: ['راتب تنافسي', 'بونص أداء', 'تأمين شامل'] },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617]" dir="rtl">
      <div className="bg-white dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${primaryColor}15` }}>
            <Briefcase className="h-8 w-8" style={{ color: primaryColor }} />
          </motion.div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">وظائف</h1>
          <p className="text-gray-500">انضم لفريقنا</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-2">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium">
          <Home className="h-4 w-4" /> العودة للرئيسية
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        {/* Benefits */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">مميزات العمل معنا</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: <Gift className="h-5 w-5" />, title: 'مزايا تنافسية', desc: 'رواتب + بونص + تأمين' },
              { icon: <Clock className="h-5 w-5" />, title: 'مرونة', desc: 'موارد عمل مرنة' },
              { icon: <MapPin className="h-5 w-5" />, title: 'موقع مميز', desc: 'القاهرة - مواقع متعددة' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: `${primaryColor}15` }}>
                  <span style={{ color: primaryColor }}>{item.icon}</span>
                </div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">{item.title}</h4>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Job Listings */}
        {jobs.map((job, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{job.title}</h3>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.location}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {job.type}</span>
                </div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {job.perks.map((perk, j) => (
                    <span key={j} className="px-2 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">{perk}</span>
                  ))}
                </div>
              </div>
              <button className="h-10 px-5 rounded-xl text-sm font-bold text-white flex items-center gap-2" style={{ backgroundColor: primaryColor }}>
                <ArrowRight className="h-4 w-4" /> تقدم
              </button>
            </div>
          </div>
        ))}

        <div className="text-center text-sm text-gray-500">
          <p>مفيش وظيفة مناسبة؟ ابعت CV على <span className="font-bold text-gray-900 dark:text-white">careers@sapkey.com</span></p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
