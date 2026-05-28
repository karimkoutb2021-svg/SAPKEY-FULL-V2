'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/store/auth-store';
import { NotificationProvider } from '@/components/notifications/notification-provider';
import { NotificationBell } from '@/components/notifications/notification-bell';

const navItems = [
  { id: 'dashboard', label: 'لوحة التحكم', labelEn: 'Dashboard', icon: 'LayoutDashboard', href: '/manager' },
  { id: 'coding', label: 'التكويـد', labelEn: 'Coding', icon: 'Tag', href: '/manager/coding' },
  { id: 'audit', label: 'الجرد', labelEn: 'Audit', icon: 'ClipboardCheck', href: '/manager/audit' },
  { id: 'inventory', label: 'المخزون', labelEn: 'Inventory', icon: 'Package', href: '/manager/inventory' },
  { id: 'posmonitor', label: 'نقاط البيع', labelEn: 'POS Monitor', icon: 'Monitor', href: '/manager/pos-monitoring' },
  { id: 'orders', label: 'الطلبات', labelEn: 'Orders', icon: 'ShoppingCart', href: '/manager/orders' },
  { id: 'treasury', label: 'الخزينة', labelEn: 'Treasury', icon: 'Wallet', href: '/manager/treasury' },
  { id: 'expenses', label: 'المصروفات', labelEn: 'Expenses', icon: 'Receipt', href: '/manager/expenses' },
  { id: 'transfers', label: 'التحويلات', labelEn: 'Transfers', icon: 'ArrowRightLeft', href: '/manager/transfers' },
  { id: 'employees', label: 'الموظفين', labelEn: 'Employees', icon: 'Users', href: '/manager/employees' },
  { id: 'tasks', label: 'المهام', labelEn: 'Tasks', icon: 'CheckSquare', href: '/manager/tasks' },
  { id: 'timecontrol', label: 'الحضور', labelEn: 'Time Control', icon: 'Clock', href: '/manager/time-control' },
  { id: 'reconciliation', label: 'المطابقة', labelEn: 'Reconciliation', icon: 'CheckCircle2', href: '/manager/reconciliation' },
  { id: 'reports', label: 'تقارير BI', labelEn: 'BI Reports', icon: 'BarChart3', href: '/manager/reports' },
  { id: 'notifications', label: 'الإشعارات', labelEn: 'Notifications', icon: 'Bell', href: '/manager/notifications' },
  { id: 'aibi', label: 'الذكاء الاصطناعي', labelEn: 'AI BI Hub', icon: 'Brain', href: '/manager/ai-bi' },
  { id: 'developer', label: 'أدوات المطور', labelEn: 'Developer Tools', icon: 'DatabaseZap', href: '/manager/developer' },
];

function getIcon(name: string, active: boolean) {
  const cls = `w-5 h-5 ${active ? 'text-emerald-400' : 'text-gray-400'}`;
  switch (name) {
    case 'LayoutDashboard': return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10-2a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z" /></svg>;
    case 'Wallet': return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 6h18M3 6a2 2 0 012-2h14a2 2 0 012 2M3 6v12a2 2 0 002 2h14a2 2 0 002-2V6M16 14a1 1 0 100-2 1 1 0 000 2z" /></svg>;
    case 'Package': return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
    case 'Tag': return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>;
    case 'ArrowRightLeft': return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>;
    case 'ClipboardCheck': return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>;
    case 'ShoppingCart': return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>;
    case 'Clock': return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    case 'BarChart3': return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
    case 'Brain': return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>;
    case 'Monitor': return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>;
    case 'Receipt': return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>;
    case 'Users': return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
    case 'CheckSquare': return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>;
    case 'CheckCircle2': return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    case 'Bell': return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;
    case 'DatabaseZap': return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
    default: return null;
  }
}

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const isCashier = user?.role === 'cashier';
  const allowedNavItems = navItems.filter(item => {
    if (!isCashier) return true;
    return item.id === 'coding' || item.id === 'audit';
  });

  useEffect(() => {
    if (isCashier && pathname) {
      const allowedPaths = ['/manager/coding', '/manager/audit'];
      const isAllowed = allowedPaths.some(p => pathname.startsWith(p));
      if (!isAllowed) {
        router.replace('/manager/coding');
      }
    }
  }, [isCashier, pathname, router]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0C] text-gray-900 dark:text-white flex">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed top-0 right-0 md:left-0 md:right-auto h-full bg-white/90 dark:bg-[#0A0A0C]/90 backdrop-blur-2xl border-l md:border-l-0 md:border-r border-gray-200 dark:border-white/[0.06] z-50 transition-all duration-300 ease-out',
        // Desktop sizing
        sidebarOpen ? 'md:w-64' : 'md:w-20',
        // Mobile sizing and toggle
        'w-64 md:w-auto',
        mobileMenuOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
      )} dir="rtl">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center px-4 border-b border-gray-200 dark:border-white/[0.06] justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-bold text-sm text-white shadow-sm">M</div>
              {(sidebarOpen || mobileMenuOpen) && <span className="mr-3 font-semibold text-sm text-gray-800 dark:text-white">Manager Dashboard</span>}
            </div>
            {/* Close button on mobile */}
            <button className="md:hidden text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white" onClick={() => setMobileMenuOpen(false)}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {allowedNavItems.map((item) => {
              const active = pathname === item.href || (item.href !== '/manager' && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
                    active
                      ? 'bg-emerald-50 dark:bg-white/[0.08] text-emerald-700 dark:text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.04] hover:text-gray-900 dark:hover:text-white'
                  )}
                >
                  <span className="transition-transform duration-200 group-hover:scale-110 shrink-0">
                    {getIcon(item.icon, active)}
                  </span>
                  {(sidebarOpen || mobileMenuOpen) && (
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate">{item.label}</span>
                      <span className="text-[10px] text-gray-500 truncate">{item.labelEn}</span>
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200 dark:border-white/[0.06] hidden md:block">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.04] hover:text-gray-900 dark:hover:text-white transition-all duration-200"
            >
              <svg className={cn('w-5 h-5 transition-transform duration-300', !sidebarOpen && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
              {sidebarOpen && <span className="text-sm">إخفاء القائمة</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn('flex-1 transition-all duration-300 min-w-0', sidebarOpen ? 'md:mr-64' : 'md:mr-20')} dir="rtl">
        <NotificationProvider>
          {/* Top Bar */}
          <header className="sticky top-0 z-30 h-16 bg-white/60 dark:bg-[#0A0A0C]/60 backdrop-blur-2xl border-b border-gray-200 dark:border-white/[0.06] flex items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-3 md:gap-4">
              <button 
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden h-9 w-9 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/[0.1] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
              
              {pathname !== '/manager' && (
                <button 
                  onClick={() => window.history.back()} 
                  className="h-8 w-8 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/[0.1] transition-colors"
                  title="رجوع"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <h1 className="text-base md:text-lg font-semibold truncate max-w-[150px] sm:max-w-none text-gray-800 dark:text-white">
                {allowedNavItems.find(i => i.href === pathname || (i.href !== '/manager' && pathname?.startsWith(i.href)))?.label || 'لوحة التحكم'}
              </h1>
            </div>
            <div className="flex items-center gap-2 md:gap-4 shrink-0">
              <NotificationBell />
              <span className="hidden sm:inline text-sm text-gray-500 dark:text-gray-400 font-mono">
                {currentTime.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <Link href="/" className="px-2 py-1 md:px-3 md:py-1.5 rounded-lg bg-gray-100 dark:bg-white/[0.06] text-xs md:text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.1] transition-colors text-center border border-gray-200 dark:border-transparent">
                العودة للمتجر
              </Link>
            </div>
          </header>

          {/* Page Content */}
          <div className={cn(
            "overflow-x-hidden",
            (pathname === '/manager/coding' || pathname === '/manager/audit') 
              ? "p-2 pb-24 md:pb-2 md:p-4 h-[calc(100vh-4rem)] flex flex-col" 
              : "p-4 md:p-6 pb-24 md:pb-6"
          )}>
            {children}
          </div>
        </NotificationProvider>
      </main>
    </div>
  );
}
