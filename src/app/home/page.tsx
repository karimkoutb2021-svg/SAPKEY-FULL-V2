'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import {
  ShoppingCart, Shield, TrendingUp, Zap, Smartphone, BarChart3,
  Truck, Headphones, Star, ChevronRight, Menu, X, ArrowLeft, ArrowRight,
  Package, CreditCard, Users, Globe, Check, Play,
  MessageCircle, LogIn, Store, LayoutDashboard, BookOpen,
  ArrowUpRight, FileText, Settings, Database, Cloud, Lock,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBrandingStore } from '@/lib/store/branding-store';
import { getDefaultRouteForRole } from '@/lib/permissions';
import { Footer } from '@/components/layout/footer';

/* ───────────── Animated Counter ───────────── */
function AnimatedNumber({ target, suffix = '' }: { target: number; suffix?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 2000;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setValue(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, target]);

  return <span ref={ref}>{value.toLocaleString()}{suffix}</span>;
}

/* ───────────── Feature Card ───────────── */
function FeatureCard({ icon: Icon, title, desc, delay, gradient }: {
  icon: any; title: string; desc: string; delay: number; gradient: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-30px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="group relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900/50 border border-gray-100 dark:border-slate-800 p-6 shadow-sm hover:shadow-xl transition-all duration-300"
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br ${gradient}`} />
      <div className={`relative h-12 w-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 shadow-md`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <h3 className="relative text-sm font-bold text-gray-900 dark:text-white mb-1.5">{title}</h3>
      <p className="relative text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
    </motion.div>
  );
}

/* ───────────── Guide Section ───────────── */
function GuideSection({ icon: Icon, title, steps, delay }: {
  icon: any; title: string; steps: string[]; delay: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-20px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay, duration: 0.5 }}
      className="bg-white dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-800 p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <Icon className="h-5 w-5 text-emerald-600" />
        </div>
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <ol className="space-y-2">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
            <span className="h-5 w-5 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-[10px] font-bold text-gray-500 mt-0.5">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </motion.div>
  );
}

/* ───────────── Main Page ───────────── */
export default function SystemGuidePage() {
  const router = useRouter();
  const { isAuthenticated, user, initFromSession } = useAuthStore();
  const { branding } = useBrandingStore();
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.15], [0, -60]);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    initFromSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const primaryColor = branding.primaryColor || '#22C55E';
  const isManager = user?.role === 'manager' || user?.role === 'admin';

  return (
    <div className="min-h-screen bg-white dark:bg-[#020617]" dir="rtl">
      {/* ───── Progress Bar ───── */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-green-400 z-[100] origin-right"
        style={{ scaleX: scrollYProgress }}
      />

      {/* ───── Sticky Header ───── */}
      <motion.header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl shadow-sm border-b border-gray-100/50 dark:border-slate-800/50' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push(isManager ? getDefaultRouteForRole(user!.role) : '/')} className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
              <ArrowRight className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            </button>
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-bold text-gray-900 dark:text-white">دليل النظام</span>
              <span className="hidden sm:block text-[9px] text-gray-400 -mt-0.5">SAPKEY SOLUTIONS</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            {['المميزات', 'الأدوار', 'الدليل', 'التقنية'].map((item) => (
              <a key={item} href={`#${item}`} className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {isAuthenticated && user && (
              <button onClick={() => router.push(getDefaultRouteForRole(user.role))}
                className="h-9 px-4 rounded-xl text-xs font-bold text-white shadow-lg hover:shadow-xl transition-all"
                style={{ backgroundColor: primaryColor }}>
                لوحة التحكم
              </button>
            )}
            <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden h-9 w-9 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
              {mobileMenu ? <X className="h-4 w-4 text-gray-600 dark:text-gray-300" /> : <Menu className="h-4 w-4 text-gray-600 dark:text-gray-300" />}
            </button>
          </div>
        </div>

        {mobileMenu && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="md:hidden bg-white dark:bg-slate-950 border-t border-gray-100 dark:border-slate-800 px-4 py-4 space-y-3">
            {['المميزات', 'الأدوار', 'الدليل', 'التقنية'].map((item) => (
              <a key={item} href={`#${item}`} onClick={() => setMobileMenu(false)}
                className="block text-sm text-gray-700 dark:text-gray-300 py-2 border-b border-gray-50 dark:border-slate-800">
                {item}
              </a>
            ))}
          </motion.div>
        )}
      </motion.header>

      {/* ───── Hero Section ───── */}
      <motion.section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16"
        style={{ opacity: heroOpacity, y: heroY }}>
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-green-50 dark:from-slate-950 dark:via-[#020617] dark:to-emerald-950/20" />
        <div className="absolute inset-0 opacity-30 dark:opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(34,197,94,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(16,185,129,0.1) 0%, transparent 50%)' }} />

        <motion.div animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-32 left-8 sm:left-20 h-20 w-20 sm:h-28 sm:w-28 rounded-3xl bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 flex items-center justify-center shadow-xl overflow-hidden">
          <span className="text-5xl sm:text-7xl drop-shadow-lg">🥬</span>
        </motion.div>
        <motion.div animate={{ y: [0, 10, 0], rotate: [0, -3, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute bottom-32 right-8 sm:right-20 h-16 w-16 sm:h-24 sm:w-24 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center shadow-xl overflow-hidden">
          <span className="text-3xl sm:text-5xl drop-shadow-lg">🍞</span>
        </motion.div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold mb-6"
          >
            <BookOpen className="h-3.5 w-3.5" />
            دليل النظام الشامل
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="mt-2 text-4xl sm:text-5xl md:text-7xl font-black text-gray-900 dark:text-white leading-tight"
          >
            نظام إدارة
            <span className="block mt-1" style={{ color: primaryColor }}>السوبر ماركت</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-6 text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed"
          >
            دليلك الشامل لفهم واستخدام جميع ميزات النظام.
            <br className="hidden sm:block" />
            من نقطة البيع إلى المحاسبة والتقارير الذكية.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <button onClick={() => document.getElementById('المميزات')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto h-12 px-8 rounded-2xl text-sm font-bold text-white shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: primaryColor }}>
              استكشف المميزات <ArrowLeft className="h-4 w-4" />
            </button>
            {isAuthenticated && user && (
              <button onClick={() => router.push(getDefaultRouteForRole(user.role))}
                className="w-full sm:w-auto h-12 px-8 rounded-2xl text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 transition-all flex items-center justify-center gap-2 shadow-sm">
                <LayoutDashboard className="h-4 w-4" /> لوحة التحكم
              </button>
            )}
          </motion.div>
        </div>

        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
        >
          <span className="text-[10px] text-gray-400">اسحب للأسفل</span>
          <div className="h-6 w-4 rounded-full border-2 border-gray-300 dark:border-slate-600 flex justify-center pt-1">
            <div className="h-1.5 w-1.5 rounded-full bg-gray-400 dark:bg-slate-500" />
          </div>
        </motion.div>
      </motion.section>

      {/* ───── Stats Section ───── */}
      <section className="relative py-16 bg-gradient-to-r from-emerald-500 to-green-600 dark:from-emerald-900 dark:to-green-900">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: 500, suffix: '+', label: 'متجر نشط', icon: Store },
              { value: 50000, suffix: '+', label: 'طلب شهرياً', icon: ShoppingCart },
              { value: 99, suffix: '%', label: 'نسبة الرضا', icon: Star },
              { value: 24, suffix: '/7', label: 'دعم فني', icon: Headphones },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="inline-flex h-12 w-12 rounded-xl bg-white/10 backdrop-blur-sm items-center justify-center mb-3">
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
                <p className="text-2xl sm:text-3xl font-black text-white">
                  <AnimatedNumber target={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-xs text-white/70 mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Features Section ───── */}
      <section id="المميزات" className="py-20 bg-gray-50 dark:bg-[#020617]">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold mb-3">
              المميزات
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white">
              كل ما تحتاجه في
              <span style={{ color: primaryColor }}> نظام واحد</span>
            </h2>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              أدوات متكاملة لإدارة كل جانب من جوانب سوبر ماركتك
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <FeatureCard icon={ShoppingCart} title="نقطة بيع POS" desc="واجهة كاشير سريعة وسهلة تدعم الباركود والدفع المتعدد" delay={0} gradient="from-emerald-500 to-green-600" />
            <FeatureCard icon={Package} title="إدارة المخزون" desc="تتبع المخزون، الدفعات، صلاحية المنتجات والتنبيهات الذكية" delay={0.1} gradient="from-blue-500 to-indigo-600" />
            <FeatureCard icon={BarChart3} title="تقارير ذكية" desc="تقارير مبيعات، أرباح وخسائر، وتحليلات متقدمة" delay={0.2} gradient="from-purple-500 to-violet-600" />
            <FeatureCard icon={CreditCard} title="محاسبة متكاملة" desc="شجرة حسابات، يومية، ميزانية، رواتب ومصروفات نثرية" delay={0.3} gradient="from-amber-500 to-orange-600" />
            <FeatureCard icon={Truck} title="تتبع التوصيل" desc="توصيل الطلبات مع تتبع GPS مباشر للمندوبين" delay={0.4} gradient="from-cyan-500 to-teal-600" />
            <FeatureCard icon={Smartphone} title="تطبيق موبايل" desc="PWA يعمل على جميع الأجهزة كتطبيق حقيقي" delay={0.5} gradient="from-pink-500 to-rose-600" />
            <FeatureCard icon={Shield} title="صلاحيات متقدمة" desc="9 أدوار مختلفة: مدير، كاشير، محاسب، مندوب مشتريات..." delay={0.6} gradient="from-slate-500 to-gray-600" />
            <FeatureCard icon={Zap} title="سرعة فائقة" desc="أداء سريع مع دعم العمل بدون إنترنت" delay={0.7} gradient="from-red-500 to-orange-600" />
          </div>
        </div>
      </section>

      {/* ───── Roles Section ───── */}
      <section id="الأدوار" className="py-20 bg-white dark:bg-slate-950/50">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="inline-block px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold mb-3">
              الأدوار والصلاحيات
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white">
              9 أدوار
              <span style={{ color: primaryColor }}> متكاملة</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { role: 'مطور النظام', desc: 'تحكم تقني كامل في النظام', color: 'from-red-500 to-rose-600', perms: ['إدارة المشتركين', 'إعدادات النظام', 'المراقبة', 'النسخ الاحتياطي'] },
              { role: 'المدير', desc: 'إدارة كاملة للمتجر', color: 'from-blue-500 to-indigo-600', perms: ['جميع الصلاحيات', 'التقارير', 'إدارة الموظفين', 'الإعدادات'] },
              { role: 'محاسب', desc: 'الشؤون المالية', color: 'from-emerald-500 to-green-600', perms: ['المحاسبة', 'التقارير المالية', 'الرواتب', 'المصروفات'] },
              { role: 'كاشير', desc: 'نقطة البيع', color: 'from-amber-500 to-orange-600', perms: ['POS', 'المبيعات', 'الفواتير', 'المرتجعات'] },
              { role: 'أمين مخزن', desc: 'إدارة المخزون', color: 'from-purple-500 to-violet-600', perms: ['المخزون', 'الدفعات', 'التحويلات', 'الجرد'] },
              { role: 'مندوب مشتريات', desc: 'المشتريات والتوريد', color: 'from-cyan-500 to-teal-600', perms: ['أوامر الشراء', 'الموردين', 'الاستلام', 'الفواتير'] },
            ].map(({ role, desc, color, perms }) => (
              <div key={role} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-5">
                <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3 shadow-md`}>
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">{role}</h3>
                <p className="text-[10px] text-gray-400 mt-0.5 mb-3">{desc}</p>
                <div className="space-y-1">
                  {perms.map((p) => (
                    <div key={p} className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
                      <Check className="h-3 w-3 text-emerald-500" /> {p}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Guide Section ───── */}
      <section id="الدليل" className="py-20 bg-gray-50 dark:bg-[#020617]">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="inline-block px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[10px] font-bold mb-3">
              دليل الاستخدام
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white">
              كيف تستخدم
              <span style={{ color: primaryColor }}> النظام؟</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GuideSection
              icon={ShoppingCart}
              title="نقطة البيع POS"
              steps={[
                'افتح صفحة POS من القائمة الجانبية',
                'امسح الباركود أو ابحث عن المنتج',
                'أضف المنتجات للسلة',
                'اختر طريقة الدفع (نقدي/بطاقة)',
                'اطبع الفاتورة أو أرسلها واتساب',
              ]}
              delay={0}
            />
            <GuideSection
              icon={Package}
              title="إدارة المخزون"
              steps={[
                'أضف المنتجات مع الباركود والصور',
                'حدد الوحدات المختلفة (قطعة، كيلو...)',
                'تابع صلاحية المنتجات تلقائياً',
                'استلم دفعات جديدة من الموردين',
                'حوّل بين الفروع بسهولة',
              ]}
              delay={0.1}
            />
            <GuideSection
              icon={CreditCard}
              title="المحاسبة"
              steps={[
                'شجرة حسابات جاهزة (50+ حساب)',
                'سجل القيود في اليومية العامة',
                'تابع الصندوق النثري',
                'اطلع على ميزان المراجعة',
                'استخرج قائمة الأرباح والخسائر',
              ]}
              delay={0.2}
            />
            <GuideSection
              icon={BarChart3}
              title="التقارير"
              steps={[
                'تقارير المبيعات اليومية/الشهرية',
                'تقرير الأرباح والخسائر',
                'تقرير المخزون والمنتجات منخفضة',
                'تقرير أداء الموظفين',
                'تصدير Excel/PDF',
              ]}
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* ───── Technical Section ───── */}
      <section id="التقنية" className="py-20 bg-white dark:bg-slate-950/50">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="inline-block px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold mb-3">
              البنية التقنية
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white">
              مبني على
              <span style={{ color: primaryColor }}> أحدث التقنيات</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { icon: Globe, name: 'Next.js 16', desc: 'App Router' },
              { icon: Database, name: 'Supabase', desc: 'PostgreSQL' },
              { icon: Cloud, name: 'Vercel', desc: 'Hosting' },
              { icon: Shield, name: 'RBAC', desc: 'صلاحيات' },
              { icon: Smartphone, name: 'PWA', desc: 'موبايل' },
              { icon: Zap, name: 'Turbopack', desc: 'Build' },
            ].map(({ icon: Icon, name, desc }) => (
              <div key={name} className="bg-gray-50 dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-4 text-center">
                <Icon className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-gray-900 dark:text-white">{name}</p>
                <p className="text-[10px] text-gray-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── CTA Section ───── */}
      <section className="py-20 bg-gradient-to-br from-emerald-600 to-green-700 dark:from-emerald-900 dark:to-green-950 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 70%, rgba(255,255,255,0.1) 0%, transparent 50%)' }} />
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">جاهز تبدأ؟</h2>
            <p className="text-base text-white/80 mb-8 max-w-lg mx-auto">
              انضم لمئات المتاجر اللي بتثق في نظامنا. جربه مجاناً من غير بطاقة ائتمان.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {isAuthenticated && user ? (
                <button onClick={() => router.push(getDefaultRouteForRole(user.role))}
                  className="w-full sm:w-auto h-12 px-8 rounded-2xl text-sm font-bold bg-white text-emerald-700 shadow-xl hover:shadow-2xl transition-all">
                  لوحة التحكم
                </button>
              ) : (
                <button onClick={() => router.push('/')}
                  className="w-full sm:w-auto h-12 px-8 rounded-2xl text-sm font-bold bg-white text-emerald-700 shadow-xl hover:shadow-2xl transition-all">
                  الصفحة الرئيسية
                </button>
              )}
              <button onClick={() => window.open(`https://wa.me/${branding.developerWhatsApp || '201061935361'}?text=${encodeURIComponent('أريد معرفة المزيد عن نظام SAPKEY')}`, '_blank')}
                className="w-full sm:w-auto h-12 px-8 rounded-2xl text-sm font-medium text-white border-2 border-white/30 hover:border-white/60 transition-all flex items-center justify-center gap-2">
                <MessageCircle className="h-4 w-4" /> تواصل معنا
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ───── Professional Footer ───── */}
      <Footer />
    </div>
  );
}
