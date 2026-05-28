'use client';

import { ShieldCheck, MonitorSmartphone, QrCode, ShoppingCart, UserCog, BadgeCheck, FileBarChart, Zap, HandCoins, Headset, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoleInfographicProps {
  role: 'developer' | 'manager' | 'cashier' | 'customer';
}

export function RoleInfographic({ role }: RoleInfographicProps) {
  const content = {
    developer: {
      title: "صلاحيات المطور الأساسية",
      subtitle: "التحكم الكامل والإعدادات الفنية",
      color: "from-purple-500 to-indigo-600",
      features: [
        { icon: ShieldCheck, title: "إدارة النظام", desc: "التحكم الشامل في إعدادات التطبيق والمستخدمين وقواعد البيانات." },
        { icon: MonitorSmartphone, title: "إدارة الأجهزة", desc: "ربط وإدارة أجهزة نقاط البيع، والطابعات، وموازين الباركود." },
        { icon: Zap, title: "الصيانة السريعة", desc: "تتبع الأخطاء البرمجية وحلها لحظياً دون تعطيل حركة العمل." },
        { icon: FileBarChart, title: "قواعد البيانات", desc: "النسخ الاحتياطي، المزامنة، وصيانة الجداول وتنظيم الـ API." }
      ]
    },
    manager: {
      title: "صلاحيات الإدارة المتقدمة",
      subtitle: "المراقبة والتقارير والرقابة",
      color: "from-blue-500 to-cyan-600",
      features: [
        { icon: UserCog, title: "إدارة الموظفين", desc: "إضافة الكاشير والموظفين، وتحديد الورديات وصلاحيات الوصول." },
        { icon: BadgeCheck, title: "إدارة المخزون والتكويد", desc: "مراجعة واعتماد منتجات التكويد الجديدة، والاطلاع على الجرد." },
        { icon: FileBarChart, title: "التقارير المالية", desc: "متابعة الخزينة، الأرباح، المبيعات اليومية، وتحليل أداء المتجر." },
        { icon: HandCoins, title: "التوريدات والمصروفات", desc: "دفع مستحقات الموردين، وإدارة العهد المالية بدقة متناهية." }
      ]
    },
    cashier: {
      title: "أدوات الكاشير السريعة",
      subtitle: "نقاط البيع، البيع، المرتجعات",
      color: "from-emerald-500 to-teal-600",
      features: [
        { icon: ShoppingCart, title: "نقاط البيع (POS)", desc: "واجهة سريعة للبيع عبر مسدس الباركود وإضافة المنتجات بلمسة." },
        { icon: QrCode, title: "الجرد والتكويد", desc: "إنشاء مسودات منتجات جديدة، وجرد الرفوف باستخدام الباركود." },
        { icon: Wallet, title: "المرتجعات والمحفظة", desc: "إرجاع المنتجات بسهولة وإضافة الرصيد لمحفظة العميل فوراً." },
        { icon: MonitorSmartphone, title: "مزامنة سحابية", desc: "العمل بدون إنترنت والمزامنة التلقائية عند عودة الاتصال." }
      ]
    },
    customer: {
      title: "دليل العميل للتسوق",
      subtitle: "المحفظة، المشتريات، والولاء",
      color: "from-amber-500 to-orange-600",
      features: [
        { icon: Wallet, title: "المحفظة الرقمية", desc: "شحن رصيدك واستخدامه في المشتريات بسهولة عبر الباركود الشخصي." },
        { icon: ShoppingCart, title: "سجل المشتريات", desc: "متابعة جميع فواتيرك القديمة، ومعرفة المبالغ المصروفة." },
        { icon: BadgeCheck, title: "نقاط الولاء", desc: "الحصول على نقاط مع كل عملية شراء، واستبدالها بخصومات." },
        { icon: Headset, title: "الدعم والمساعدة", desc: "التواصل مع الإدارة أو الدعم الفني بكل سهولة عبر النظام." }
      ]
    }
  };

  const data = content[role];

  return (
    <div className="w-full relative overflow-hidden bg-white/60 dark:bg-[#1C1C1E]/60 backdrop-blur-3xl rounded-[2rem] border border-gray-200/50 dark:border-white/10 shadow-2xl p-6 sm:p-10 mb-8 mt-4 print:shadow-none print:border-gray-300">
      {/* Background Decor */}
      <div className={cn("absolute -top-32 -left-32 w-64 h-64 rounded-full mix-blend-multiply filter blur-3xl opacity-20 dark:opacity-10 bg-gradient-to-br", data.color)} />
      <div className={cn("absolute -bottom-32 -right-32 w-64 h-64 rounded-full mix-blend-multiply filter blur-3xl opacity-20 dark:opacity-10 bg-gradient-to-br", data.color)} />

      <div className="relative z-10 text-center mb-10">
        <h2 className={cn("text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r mb-3 inline-block", data.color)}>
          {data.title}
        </h2>
        <p className="text-sm sm:text-base font-medium text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
          {data.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
        {data.features.map((feature, idx) => (
          <div key={idx} className="group flex gap-4 bg-white/80 dark:bg-slate-900/50 p-5 rounded-2xl border border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 transition-all hover:shadow-xl hover:-translate-y-1">
            <div className={cn("shrink-0 h-12 w-12 rounded-2xl flex items-center justify-center bg-gradient-to-br shadow-inner", data.color)}>
              <feature.icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white mb-1.5">{feature.title}</h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                {feature.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center relative z-10">
        <div className="inline-flex items-center justify-center gap-2 px-6 py-2 rounded-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-white/10">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400">معلومات موثقة وآمنة 100%</span>
        </div>
      </div>
    </div>
  );
}
