'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { useAppStore } from '@/lib/store/app-store';
import { useBrandingStore } from '@/lib/store/branding-store';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Bell, LogOut, ChevronDown, Menu, Search, Headphones, ShoppingCart, MessageCircle, Home, Store,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RefreshButton, BackupButton, RestoreButton, OnlineIndicator } from '@/components/layout/app-tools';

function getRoleLabelAr(role?: string): string {
  const labels: Record<string, string> = {
    admin: 'مدير النظام',
    manager: 'مدير',
    accountant: 'محاسب',
    cashier: 'كاشير',
    warehouse: 'مخازن',
    sales: 'مبيعات',
    delivery: 'توصيل',
    supplier: 'مورد',
    customer: 'عميل',
    purchase: 'مشتريات',
  };
  return labels[role || ''] || 'مستخدم';
}

export function Header() {
  const { user, logout } = useAuthStore();
  const { toggleSidebar, language } = useAppStore();
  const branding = useBrandingStore((s) => s.branding);
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const isRtl = language === 'ar';

  const handleLogout = () => {
    try { logout(); } catch {}
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('auth_user');
      sessionStorage.removeItem('auth_authenticated');
    }
    router.replace('/');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-gray-200/50 shadow-sm">
      <div className="px-3 sm:px-4 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Logo + Brand */}
        <div className="flex items-center gap-3">
          <button onClick={toggleSidebar} className="apple-btn-icon lg:hidden">
            <Menu className="h-5 w-5" />
          </button>

          <button onClick={() => router.push('/')} className="h-9 w-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <Home className="h-4 w-4 text-gray-900" />
          </button>

          {(branding.logo || '/logo.jpg') ? (
            <img src={branding.logo || '/logo.jpg'} className="h-8 w-8 rounded-lg object-contain block" alt={branding.storeName} />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center hidden md:flex" style={{ color: branding.primaryColor }}>
              <Store className="h-4 w-4" />
            </div>
          )}
          <div className="flex flex-col justify-center">
            <span className="font-bold text-sm block text-gray-900 dark:text-white leading-tight">
              {isRtl ? branding.storeName : branding.storeNameEn}
            </span>
            {branding.slogan && (
              <span className="text-[10px] text-gray-500 dark:text-gray-400 hidden sm:block">
                {branding.slogan}
              </span>
            )}
          </div>

          {/* Search - hidden on mobile */}
          <div className="relative hidden md:block mr-4">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="search"
              placeholder={isRtl ? 'بحث عن منتجات...' : 'Search products...'}
              className="h-9 w-64 rounded-xl border border-gray-200 bg-gray-100 pr-9 pl-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          <button className="apple-btn-icon">
            <Headphones className="h-5 w-5" />
          </button>

          <button className="apple-btn-icon">
            <MessageCircle className="h-5 w-5" />
          </button>

          <OnlineIndicator />

          <RefreshButton />
          <BackupButton />
          <RestoreButton />

          {/* Notifications */}
          <div className="relative">
            <button className="apple-btn-icon" onClick={() => setShowNotifications(!showNotifications)}>
              <Bell className="h-5 w-5" />
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                3
              </span>
            </button>
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="h-8 w-8 rounded-full flex items-center justify-center text-white font-semibold text-sm" style={{ backgroundColor: branding.primaryColor || '#0071E3' }}>
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium leading-tight text-gray-900">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-500">{isRtl ? getRoleLabelAr(user?.role) : user?.role}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400 hidden md:block" />
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                <div className={cn(
                  'absolute top-full mt-1 w-56 rounded-xl border border-gray-200 bg-white shadow-xl z-20 py-1',
                  isRtl ? 'left-0' : 'right-0'
                )}>
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" /> {isRtl ? 'تسجيل خروج' : 'Logout'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
