'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/store/auth-store';
import { useAppStore } from '@/lib/store/app-store';
import {
  Shield, Building2, CreditCard, ToggleLeft, ScrollText, BarChart3,
  Activity, Rocket, Palette, Database, ChevronRight, ChevronLeft, LogOut, Trash2, Home, LayoutDashboard, HeartPulse, User, Users, BookOpen,
} from 'lucide-react';

const adminNav = [
  { title: 'لوحة المطور', href: '/admin', icon: LayoutDashboard },
  { title: 'الملف الشخصي', href: '/admin/developer-profile', icon: User },
  { title: 'المستخدمين', href: '/admin/users', icon: Users },
  { title: 'الأدلة', href: '/admin/guides', icon: BookOpen },
  { title: 'المستأجرين', href: '/admin/tenants', icon: Building2 },
  { title: 'الباقات', href: '/admin/subscriptions', icon: CreditCard },
  { title: 'الميزات', href: '/admin/feature-flags', icon: ToggleLeft },
  { title: 'صحة النظام', href: '/admin/system-health', icon: HeartPulse },
  { title: 'الأمان', href: '/admin/security', icon: Shield },
  { title: 'سجل المراجعة', href: '/admin/audit-logs', icon: ScrollText },
  { title: 'تحليلات المنصة', href: '/admin/platform-analytics', icon: BarChart3 },
  { title: 'مراقبة API', href: '/admin/api-monitoring', icon: Activity },
  { title: 'النشر', href: '/admin/deployment', icon: Rocket },
  { title: 'العلامة التجارية', href: '/admin/branding', icon: Palette },
  { title: 'النسخ الاحتياطي', href: '/admin/backup', icon: Database },
];

const breadcrumbMap: Record<string, string> = {
  '/admin': 'لوحة المطور',
  '/admin/developer-profile': 'الملف الشخصي',
  '/admin/users': 'المستخدمين',
  '/admin/guides': 'الأدلة',
  '/admin/tenants': 'المستأجرين',
  '/admin/subscriptions': 'الباقات',
  '/admin/feature-flags': 'الميزات',
  '/admin/system-health': 'صحة النظام',
  '/admin/security': 'الأمان',
  '/admin/audit-logs': 'سجل المراجعة',
  '/admin/platform-analytics': 'تحليلات المنصة',
  '/admin/api-monitoring': 'مراقبة API',
  '/admin/deployment': 'النشر',
  '/admin/branding': 'العلامة التجارية',
  '/admin/backup': 'النسخ الاحتياطي',
};

export function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const [history, setHistory] = useState<string[]>([]);
  const [future, setFuture] = useState<string[]>([]);

  useEffect(() => {
    if (!isAuthenticated || !user) { router.replace('/login'); return; }
    if (user.role !== 'admin') { router.replace('/dashboard'); }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    setHistory((prev) => {
      if (prev.length > 0 && prev[prev.length - 1] === pathname) return prev;
      return [...prev, pathname].slice(-50);
    });
    setFuture([]);
  }, [pathname]);

  const goBack = () => {
    if (history.length > 1) {
      const prev = history[history.length - 2];
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

  if (!isAuthenticated || user?.role !== 'admin') {
    return <div className="min-h-dvh flex items-center justify-center bg-gray-950"><p className="text-gray-500">جاري التحميل...</p></div>;
  }

  const breadcrumb = breadcrumbMap[pathname] || '';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617] flex" dir="rtl">
      {/* Admin Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={toggleSidebar} />
      )}
      <aside className={cn(
        'fixed top-0 right-0 z-40 h-dvh bg-white dark:bg-[#0F172A] border-l border-gray-200 dark:border-slate-800 transition-all duration-300 shadow-lg overflow-hidden',
        sidebarOpen ? 'w-64' : 'w-16'
      )}>
        <div className="flex items-center justify-between p-4 h-16 border-b border-gray-200 dark:border-slate-800">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-sm text-gray-900 dark:text-white">Developer</span>
            </div>
          )}
          <button onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800">
            {sidebarOpen ? <ChevronRight className="h-4 w-4 text-gray-500" /> : <ChevronLeft className="h-4 w-4 text-gray-500" />}
          </button>
        </div>
        <nav className="p-2 space-y-0.5 overflow-y-auto h-[calc(100dvh-130px)]">
          {adminNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
                  isActive
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-medium'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800/50 hover:text-gray-900 dark:hover:text-white'
                )}>
                <Icon className="h-4.5 w-4.5 shrink-0" />
                {sidebarOpen && <span>{item.title}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-2 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-[#0F172A]">
          <button onClick={() => { useAuthStore.getState().logout(); window.location.href = '/login'; }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
            <LogOut className="h-4 w-4 shrink-0" />
            {sidebarOpen && <span>تسجيل خروج</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={cn('flex-1', sidebarOpen ? 'mr-64' : 'mr-16')}>
        {/* Top Bar */}
        <div className="sticky top-0 z-30 bg-white/80 dark:bg-[#020617]/80 backdrop-blur-xl border-b border-gray-200 dark:border-slate-800">
          <div className="flex items-center justify-between h-12 px-6">
            <div className="flex items-center gap-1">
              <button onClick={goBack} disabled={history.length <= 1}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button onClick={goForward} disabled={future.length === 0}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => router.push('/admin')}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-all mr-1">
                <Home className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              {breadcrumb && <span className="font-medium text-gray-900 dark:text-white">{breadcrumb}</span>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { localStorage.clear(); sessionStorage.clear(); caches.keys().then((ns) => ns.forEach((n) => caches.delete(n))); window.location.reload(); }}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-all" title="مسح الذاكرة">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                <div className="h-5 w-5 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white text-[8px] font-bold">
                  {user.name?.charAt(0) || 'D'}
                </div>
                <span className="text-[11px] font-medium text-gray-900 dark:text-white">{user.name || 'Developer'}</span>
              </div>
              <button onClick={() => { useAuthStore.getState().logout(); window.location.href = '/login'; }}
                className="h-7 px-2.5 rounded-lg flex items-center gap-1 text-[11px] text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all font-medium">
                <LogOut className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        <main className="p-6 pb-20">{children}</main>

        <footer className="border-t border-gray-100 dark:border-slate-800 bg-white/50 dark:bg-gray-950/50 backdrop-blur-sm">
          <div className="flex items-center justify-between h-12 px-6">
            <p className="text-[10px] text-gray-400 dark:text-gray-600 tracking-wider">SAPKEY SOLUTIONS<sup>TM</sup> &copy; {new Date().getFullYear()} — Platform</p>
            <p className="text-[9px] text-gray-300 dark:text-gray-700">v2.0.0</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
