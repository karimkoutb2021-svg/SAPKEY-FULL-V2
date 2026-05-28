'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store/app-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBrandingStore } from '@/lib/store/branding-store';
import {
  LayoutDashboard, ShoppingCart, Package, Boxes, Users, Truck, Warehouse,
  Calculator, BarChart3, Settings, UserCog, Store, ChevronLeft, ChevronRight,
  Headphones, FileText, ScrollText, TrendingUp, Shield, Tags, Percent, Mic, MessageCircle, LogOut, Wallet, Palette, Database, BookOpen,
} from 'lucide-react';
import { getNavItemsForRole } from '@/lib/permissions';
import { ROLES } from '@/types';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, ShoppingCart, Package, Boxes, Users, Truck, Warehouse,
  Calculator, BarChart3, Settings, UserCog, Store, Headphones, FileText,
  ScrollText, TrendingUp, Shield, Tags, Percent, Mic, MessageCircle, Palette, Database,
};

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar, language } = useAppStore();
  const { user } = useAuthStore();
  const branding = useBrandingStore((s) => s.branding);
  const isRtl = language === 'ar';

  const navItems = user ? getNavItemsForRole(user.role, user.permissions) : [];
  const roleInfo = user ? ROLES[user.role] : null;
  const userLabel = isRtl ? roleInfo?.labelAr : roleInfo?.label;

  return (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-[#0A0A0C]/80 backdrop-blur-sm z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}
      <aside
        className={cn(
          'desktop-sidebar fixed top-0 right-0 z-50 h-dvh transition-all duration-300 overflow-hidden',
          'bg-[#111114]/90 backdrop-blur-3xl',
          'border-l border-white/[0.06] shadow-2xl',
          sidebarOpen ? 'w-[260px] translate-x-0' : 'w-[80px] max-md:w-[260px] translate-x-full md:translate-x-0'
        )}
      >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/[0.06] h-16 bg-white/[0.02]">
        {sidebarOpen && (
          <div className="flex items-center gap-2 min-w-0">
            {branding.logo ? (
              <img src={branding.logo} className="h-8 w-8 rounded-lg object-contain flex-shrink-0 border border-white/[0.1]" alt={branding.storeName} />
            ) : (
              <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg" style={{ backgroundColor: branding.primaryColor || '#10B981' }}>
                <Store className="h-5 w-5 text-white" />
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm leading-tight text-white truncate">
                {isRtl ? branding.storeName : branding.storeNameEn}
              </span>
              {userLabel && (
                <span className="text-[10px] px-2 py-0.5 rounded-full inline-block w-fit mt-0.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 font-bold">
                  {userLabel}
                </span>
              )}
            </div>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-xl hover:bg-white/[0.04] transition-colors shrink-0 text-gray-400 hover:text-white border border-transparent hover:border-white/[0.08]"
        >
          {sidebarOpen ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-2 space-y-1 overflow-y-auto h-[calc(100dvh-180px)] custom-scrollbar">
        {navItems.map((item, i) => {
          const Icon = iconMap[item.icon] || LayoutDashboard;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: 0.2 }}
            >
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden',
                  isActive
                    ? 'text-white font-bold'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04] font-medium border border-transparent hover:border-white/[0.04]'
                )}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-transparent border-r-2 border-emerald-500"></div>
                )}
                <Icon className={cn("h-5 w-5 shrink-0 z-10 transition-colors", isActive ? "text-emerald-400" : "group-hover:text-emerald-400/80")} />
                <span className="sidebar-text-label text-sm z-10">{isRtl ? item.titleAr : item.title}</span>
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* System Guide (Manager/Admin only) */}
      {(user?.role === 'manager' || user?.role === 'admin') && (
        <div className="p-2 border-t border-white/[0.06] bg-white/[0.01]">
          <Link
            href="/home"
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.04] border border-transparent hover:border-white/[0.04] transition-all font-medium"
          >
            <BookOpen className="h-5 w-5 shrink-0" />
            <span className="sidebar-text-label text-sm">{isRtl ? 'دليل النظام' : 'System Guide'}</span>
          </Link>
        </div>
      )}

      {/* Logout */}
      <div className="absolute bottom-0 left-0 right-0 p-2 border-t border-white/[0.06] bg-[#111114]">
        <button
          onClick={() => {
            const { logout } = useAuthStore.getState();
            logout();
            window.location.href = '/';
          }}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all font-bold group"
        >
          <LogOut className="h-5 w-5 shrink-0 group-hover:-translate-x-1 transition-transform" />
          <span className="sidebar-text-label text-sm">{isRtl ? 'تسجيل خروج' : 'Logout'}</span>
        </button>
      </div>
    </aside>
    </>
  );
}
