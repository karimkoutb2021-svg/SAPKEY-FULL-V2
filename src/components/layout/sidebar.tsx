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
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}
      <aside
        className={cn(
          'desktop-sidebar fixed top-0 right-0 z-50 h-dvh transition-all duration-300 overflow-hidden',
          'bg-white/95 backdrop-blur-[25px]',
          'border-l border-gray-200/50',
          sidebarOpen ? 'w-[260px] translate-x-0' : 'w-[80px] max-md:w-[260px] translate-x-full md:translate-x-0'
        )}
      >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200/50 h-16">
        {sidebarOpen && (
          <div className="flex items-center gap-2 min-w-0">
            {branding.logo ? (
              <img src={branding.logo} className="h-8 w-8 rounded-lg object-contain flex-shrink-0" alt={branding.storeName} />
            ) : (
              <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: branding.primaryColor || '#10B981' }}>
                <Store className="h-5 w-5 text-white" />
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm leading-tight text-gray-900 truncate">
                {isRtl ? branding.storeName : branding.storeNameEn}
              </span>
              {userLabel && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full inline-block w-fit mt-0.5 text-[#10B981] bg-[rgba(16,185,129,0.12)]">
                  {userLabel}
                </span>
              )}
            </div>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors shrink-0 text-gray-500 hover:text-gray-900"
        >
          {sidebarOpen ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-2 space-y-1 overflow-y-auto h-[calc(100dvh-180px)] scrollbar-hide">
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
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300',
                  isActive
                    ? 'bg-[#10B981] text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="sidebar-text-label text-sm font-medium truncate">{isRtl ? item.titleAr : item.title}</span>
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* System Guide (Manager/Admin only) */}
      {(user?.role === 'manager' || user?.role === 'admin') && (
        <div className="p-2 border-t border-gray-200/50">
          <Link
            href="/home"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all"
          >
            <BookOpen className="h-5 w-5 shrink-0" />
            <span className="sidebar-text-label text-sm">{isRtl ? 'دليل النظام' : 'System Guide'}</span>
          </Link>
        </div>
      )}

      {/* Logout */}
      <div className="absolute bottom-0 left-0 right-0 p-2 border-t border-gray-200/50 bg-white/95">
        <button
          onClick={() => {
            const { logout } = useAuthStore.getState();
            logout();
            window.location.href = '/';
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 transition-all"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span className="sidebar-text-label text-sm">{isRtl ? 'تسجيل خروج' : 'Logout'}</span>
        </button>
      </div>
    </aside>
    </>
  );
}
