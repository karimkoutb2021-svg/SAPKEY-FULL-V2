'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { MobileBottomNav } from './mobile-bottom-nav';
import { useAppStore } from '@/lib/store/app-store';
import { cn } from '@/lib/utils';
import { PageTransition } from '@/components/ui/page-transition';
import { AnimatePresence } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, LogOut, Home, Trash2, QrCode, ScanLine } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth-store';
import { getDefaultRouteForRole } from '@/lib/permissions';
import { ROLES } from '@/types';
import { SubscriptionGuard } from '@/components/subscription/subscription-guard';
import { ToolboxIntegration } from '@/components/tools/toolbox-integration';

const breadcrumbMap: Record<string, string> = {
  '/admin': 'لوحة المطور',
  '/dashboard': 'لوحة التحكم',
  '/accounting': 'المحاسبة',
  '/accounting/journal': 'المحاسبة > اليومية',
  '/accounting/expenses': 'المحاسبة > المصروفات',
  '/accounting/treasury': 'المحاسبة > الخزينة',
  '/accounting/banks': 'المحاسبة > البنوك',
  '/accounting/profit-loss': 'المحاسبة > الأرباح والخسائر',
  '/accounting/taxes': 'المحاسبة > الضرائب',
  '/accounting/reports': 'المحاسبة > التقارير',
  '/accounting/payroll': 'المحاسبة > الرواتب',
  '/inventory': 'المخزون',
  '/inventory/transfer': 'المخزون > تحويل',
  '/inventory/movements': 'المخزون > حركات',
  '/inventory/expiry': 'المخزون > الصلاحية',
  '/inventory/batches': 'المخزون > الدفعات',
  '/inventory/reports': 'المخزون > التقارير',
  '/purchase-orders': 'طلبات التوريد',
  '/products': 'المنتجات',
  '/warehouse': 'المستودعات',
  '/orders': 'الطلبات',
  '/customers': 'العملاء',
  '/suppliers': 'الموردين',
  '/invoices': 'الفواتير',
  '/employees': 'الموظفين',
  '/offers': 'العروض',
  '/coupons': 'الكوبونات',
  '/analytics': 'التحليلات',
  '/delivery': 'التوصيل',
  '/pos': 'نقطة البيع',
  '/pos/returns': 'نقطة البيع > مرتجعات',
  '/ai-assistant': 'المساعد الذكي',
  '/ai-ordering': 'الطلب الصوتي',
  '/wallet': 'المحافظ',
  '/whatsapp': 'واتساب',
  '/wholesale': 'الجملة والحسابات',
  '/settings': 'الإعدادات',
  '/settings/branding': 'الإعدادات > العلامة التجارية',
  '/backup': 'التقارير والنسخ الاحتياطي',
};

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { sidebarOpen } = useAppStore();
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [history, setHistory] = useState<string[]>([]);
  const [future, setFuture] = useState<string[]>([]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.replace('/login');
      return;
    }
    if (user.role === 'admin') {
      if (!pathname.startsWith('/admin')) {
        router.replace('/admin');
      }
      return;
    }
    if (pathname.startsWith('/admin')) {
      router.replace(getDefaultRouteForRole(user.role));
    }
  }, [isAuthenticated, user, pathname, router]);

  const clearCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    caches.keys().then((names) => names.forEach((n) => caches.delete(n)));
    window.location.reload();
  };

  const goBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setFuture([pathname, ...future]);
      setHistory(history.slice(0, -1));
      router.push(prev);
    }
  };

  const goForward = () => {
    if (future.length > 0) {
      const next = future[0];
      setHistory([...history, pathname]);
      setFuture(future.slice(1));
      router.push(next);
    }
  };

  useEffect(() => {
    setHistory((prev) => {
      if (prev.length > 0 && prev[prev.length - 1] === pathname) return prev;
      return [...prev, pathname].slice(-50);
    });
    setFuture([]);
  }, [pathname]);

  const breadcrumb = breadcrumbMap[pathname] || '';
  const roleInfo = user ? ROLES[user.role] : null;

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0C]">
        <div className="text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl mx-auto bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center shadow-lg shadow-emerald-500/10 border border-emerald-500/30">
            <Home className="h-6 w-6 text-emerald-400 animate-pulse" />
          </div>
          <p className="text-sm font-bold text-gray-400">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#0A0A0C]">
      <Sidebar />
      <MobileBottomNav />

      <div className={cn('main-content-area transition-[margin] duration-300', !sidebarOpen && 'sidebar-collapsed')}>
        <Header />

        <div className="sticky top-16 z-20 bg-[#111114]/80 backdrop-blur-3xl border-b border-white/[0.06]">
          <div className="content-container flex items-center justify-between h-14 px-4">
            <div className="flex items-center gap-1">
              <button onClick={goBack} disabled={history.length <= 1}
                className="h-9 w-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-transparent hover:border-white/[0.04]" title="رجوع">
                <ChevronRight className="h-4 w-4" />
              </button>
              <button onClick={goForward} disabled={future.length === 0}
                className="h-9 w-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-transparent hover:border-white/[0.04]" title="للأمام">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => router.push('/dashboard')}
                className="h-9 w-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.04] transition-all border border-transparent hover:border-white/[0.04]" title="الرئيسية">
                <Home className="h-4 w-4" />
              </button>
              
              {/* Manager Quick Tools: Coding and Audit */}
              {(user.role === 'manager' || user.role === 'admin') && (
                <>
                  <div className="w-px h-5 bg-white/[0.08] mx-1"></div>
                  <button onClick={() => router.push('/manager/coding')}
                    className="h-9 w-9 rounded-xl flex items-center justify-center text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/30 transition-all" title="التكويـد">
                    <QrCode className="h-4 w-4" />
                  </button>
                  <button onClick={() => router.push('/manager/audit')}
                    className="h-9 w-9 rounded-xl flex items-center justify-center text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/30 transition-all" title="الجـرد">
                    <ScanLine className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-gray-500">
              {breadcrumb ? (
                breadcrumb.split(' > ').map((crumb, i, arr) => (
                  <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && <span className="text-gray-600">/</span>}
                    <span className={i === arr.length - 1 ? 'font-bold text-white' : 'text-gray-400 hover:text-gray-300 transition-colors cursor-default'}>{crumb}</span>
                  </span>
                ))
              ) : (
                <span className="text-gray-500">...</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.06] shadow-inner">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xs font-bold shadow-lg">
                  {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white leading-tight">{user.name || user.email}</span>
                  {roleInfo && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full w-fit font-bold text-emerald-400 bg-emerald-500/10 mt-0.5 border border-emerald-500/20">{roleInfo.labelAr}</span>
                  )}
                </div>
              </div>
              <button onClick={clearCache} className="h-9 w-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 transition-all" title="مسح الذاكرة المؤقتة وإعادة التحميل">
                <Trash2 className="h-4 w-4" />
              </button>
              <button onClick={() => {
                useAuthStore.getState().logout();
                window.location.href = '/login';
              }} className="h-9 px-3 rounded-xl flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all font-bold group">
                <LogOut className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" /> <span className="hidden sm:inline">خروج</span>
              </button>
            </div>
          </div>
        </div>

        <main className="px-4 pb-8 md:px-6 lg:px-8 mt-6">
          <AnimatePresence mode="wait">
            <PageTransition key={pathname}>
              <SubscriptionGuard>
                {children}
              </SubscriptionGuard>
            </PageTransition>
          </AnimatePresence>
        </main>

        <footer className="border-t border-white/[0.04] bg-[#0A0A0C]">
          <div className="content-container flex items-center justify-between h-12 px-4">
            <p className="text-[10px] text-gray-500 tracking-wider font-medium">
              SAPKEY SOLUTIONS <sup>TM</sup> &copy; {new Date().getFullYear()} — جميع الحقوق محفوظة
            </p>
            <p className="text-[9px] text-gray-600 font-mono font-bold">v2.0.0</p>
          </div>
        </footer>
      </div>
      <ToolboxIntegration />
    </div>
  );
}
