'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store, Phone, MapPin, ChevronDown, ArrowUp, Clock, Shield,
  Truck, Headphones, CreditCard, Gift, Settings, ChevronLeft, MessageCircle,
  BookOpen, Globe,
} from 'lucide-react';
import { useBrandingStore } from '@/lib/store/branding-store';
import { createClient } from '@/lib/supabase/client';

export function Footer() {
  const { branding, loadFromSupabase } = useBrandingStore();
  const [openSection, setOpenSection] = useState<string | null>(null);
  const primaryColor = branding.primaryColor || '#22C55E';
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadFromSupabase();

    const supabase = createClient();
    const channel = supabase
      .channel('footer-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'branding_settings' },
        () => { loadFromSupabase(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadFromSupabase]);

  const footerSections: { title: string; description: string; icon: React.ReactNode; links: { href: string; label: string; description?: string }[] }[] = defaultFooterSections(branding);

  return (
    <footer className="bg-white dark:bg-slate-950 border-t border-gray-100 dark:border-slate-800 pb-20 lg:pb-0" dir="rtl">
      {/* Features Bar */}
      <div className="border-b border-gray-100 dark:border-slate-800">
        <div className="px-3 sm:px-4 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {features.map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${primaryColor}15` }}>
                  <div style={{ color: primaryColor }}>{feature.icon}</div>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{feature.title}</p>
                  <p className="text-xs text-gray-500">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="px-3 sm:px-4 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4">
              {(branding.logo || '/logo.jpg') ? (
                <img src={branding.logo || '/logo.jpg'} alt={branding.storeName || 'SAPKEY'} className="h-10 w-auto max-w-[160px] rounded-xl object-contain bg-white/10 p-1" />
              ) : (
                <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                  <Store className="h-5 w-5 text-white" />
                </div>
              )}
              <div>
                <span className="text-lg font-black text-gray-900 dark:text-white">{branding.storeName || 'SAPKEY'}</span>
                <span className="block text-xs text-gray-500">{branding.slogan || 'حلول ذكية للتجزئة'}</span>
              </div>
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs leading-relaxed">
              {branding.footer || 'منصة متكاملة لإدارة المتاجر ونقاط البيع'}
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <MapPin className="h-4 w-4 flex-shrink-0" style={{ color: primaryColor }} />
                <span>{branding.address || 'القاهرة، مصر'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <Phone className="h-4 w-4 flex-shrink-0" style={{ color: primaryColor }} />
                <span dir="ltr">{branding.phone || '+20 100 000 0000'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <Clock className="h-4 w-4 flex-shrink-0" style={{ color: primaryColor }} />
                <span>24/7 خدمة العملاء</span>
              </div>
            </div>
          </div>

          {/* Link Sections - Desktop */}
          <div className="hidden lg:grid lg:col-span-5 grid-cols-5 gap-6">
            {footerSections.map((section) => (
              <div key={section.title}>
                <div className="flex items-center gap-2 mb-4">
                  {section.icon && <span style={{ color: primaryColor }}>{section.icon}</span>}
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">{section.title}</h4>
                </div>
                <ul className="space-y-2.5">
                  {section.links.map((link) => (
                    <li key={link.label || link.href}>
                      <Link href={link.href}
                        className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1 group">
                        <ChevronLeft className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Link Sections - Mobile Accordion */}
          <div className="lg:hidden col-span-1 md:col-span-2 space-y-2">
            {footerSections.map((section) => (
              <div key={section.title} className="border border-gray-100 dark:border-slate-800 rounded-xl overflow-hidden">
                <button onClick={() => setOpenSection(openSection === section.title ? null : section.title)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">
                  <span>{section.title}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${openSection === section.title ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {openSection === section.title && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }} className="overflow-hidden">
                      <ul className="px-4 pb-3 space-y-2">
                        {section.links.map((link) => (
                          <li key={link.label || link.href}>
                            <Link href={link.href}
                              className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors block py-1">
                              {link.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-100 dark:border-slate-800">
        <div className="px-3 sm:px-4 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} {branding.storeName || 'SAPKEY'}. جميع الحقوق محفوظة.
            </p>
            <div className="flex items-center gap-4">
              <a href={`https://wa.me/${branding.whatsapp || '201000000000'}`} target="_blank" rel="noopener noreferrer"
                className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <MessageCircle className="h-5 w-5" />
              </a>
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                style={{ backgroundColor: `${primaryColor}15` }}>
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

const features = [
  { icon: <Truck className="h-5 w-5" />, title: 'توصيل سريع', desc: 'خلال 45 دقيقة' },
  { icon: <Shield className="h-5 w-5" />, title: 'دفع آمن', desc: 'حماية كاملة' },
  { icon: <CreditCard className="h-5 w-5" />, title: 'طرق دفع متعددة', desc: 'كاش، فيزا، إنستاباي' },
  { icon: <Gift className="h-5 w-5" />, title: 'نقاط ولاء', desc: 'اكسب مع كل طلب' },
];

function defaultFooterSections(branding: any) {
  const links = branding.footerLinks || [];
  const config = branding.footerConfig;
  const iconMap: Record<string, React.ReactNode> = {
    Truck: <Truck className="h-4 w-4" />,
    Headphones: <Headphones className="h-4 w-4" />,
    Settings: <Settings className="h-4 w-4" />,
    Store: <Store className="h-4 w-4" />,
    BookOpen: <BookOpen className="h-4 w-4" />,
    Phone: <Phone className="h-4 w-4" />,
    Globe: <Globe className="h-4 w-4" />,
    Shield: <Shield className="h-4 w-4" />,
    CreditCard: <CreditCard className="h-4 w-4" />,
    Gift: <Gift className="h-4 w-4" />,
  };

  const patchedLinks = links.map((l: any) => {
    let href = l.href;
    if (href === '/orders') href = '/customer/orders';
    if (href === '/wallet') href = '/customer/wallet';
    if (href === '/loyalty') href = '/customer'; // redirect to customer dashboard
    if (href === '/profile') href = '/customer';
    return { ...l, href };
  });

  if (config && config.sections && config.sections.length > 0) {
    return config.sections.map((section: any) => ({
      title: section.name,
      description: section.description || '',
      icon: iconMap[section.icon] || <Store className="h-4 w-4" />,
      links: patchedLinks.filter((l: any) => l.sectionId === section.id),
    }));
  }

  const sections = [
    { title: 'المتجر', description: '', icon: <Truck className="h-4 w-4" />, links: [{ href: '/shop', label: 'المنتجات' }, { href: '/offers', label: 'العروض' }] },
    { title: 'خدمة العملاء', description: '', icon: <Headphones className="h-4 w-4" />, links: [{ href: '/contact', label: 'اتصل بنا' }, { href: '/faq', label: 'الأسئلة الشائعة' }] },
    { title: 'حسابك', description: '', icon: <Settings className="h-4 w-4" />, links: [{ href: '/customer', label: 'حسابي' }, { href: '/customer/orders', label: 'طلباتي' }] },
    { title: 'النظام', description: '', icon: <Store className="h-4 w-4" />, links: [{ href: '/login', label: 'دخول الموظفين' }] },
    { title: 'الدليل المساعد', description: '', icon: <BookOpen className="h-4 w-4" />, links: [
      { href: '/guides/customer', label: 'دليل العميل' },
      { href: '/guides/cashier', label: 'دليل الكاشير' },
      { href: '/guides/manager', label: 'دليل المدير' },
    ] },
  ];

  patchedLinks.forEach((link: any) => {
    const section = sections.find((s) => s.title === link.section);
    if (section) {
      section.links.push(link);
    }
  });

  return sections;
}
