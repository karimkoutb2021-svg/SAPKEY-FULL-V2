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
import Link from 'next/link';
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
    <header className="sticky top-0 z-30 bg-[#111114]/90 backdrop-blur-3xl border-b border-white/[0.06] shadow-2xl">
      <div className="px-3 sm:px-4 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Logo + Brand */}
        <div className="flex items-center gap-3">
          <button onClick={toggleSidebar} className="h-9 w-9 rounded-xl flex items-center justify-center bg-white/[0.02] border border-white/[0.04] text-gray-400 hover:text-white hover:bg-white/[0.04] transition-colors lg:hidden">
            <Menu className="h-5 w-5" />
          </button>

          <button onClick={() => router.push('/')} className="h-9 w-9 rounded-xl flex items-center justify-center bg-white/[0.02] border border-white/[0.04] text-gray-400 hover:text-white hover:bg-white/[0.04] transition-colors">
            <Home className="h-4 w-4" />
          </button>

          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            {(branding.logo || '/logo.jpg') ? (
              <img loading="lazy" src={branding.logo || '/logo.jpg'} className="h-9 sm:h-10 w-auto max-w-[120px] object-contain block shrink-0 border border-white/[0.1] rounded-lg group-hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-shadow" alt={branding.storeName} />
            ) : (
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg group-hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-shadow" style={{ backgroundColor: branding.primaryColor || '#10B981' }}>
                <Store className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
            )}
            <div className="flex flex-col justify-center whitespace-nowrap">
              <span className="font-black text-sm sm:text-base block text-white leading-tight">
                {branding.storeName || 'SAPKEY'}
              </span>
              <span className="text-[10px] sm:text-xs text-gray-400 block font-medium">
                {branding.slogan || 'حلول ذكية للتجزئة'}
              </span>
            </div>
          </Link>

          {/* Search - hidden on mobile */}
          <div className="relative hidden lg:block mx-4 flex-1 max-w-xl">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="search"
              placeholder={isRtl ? 'بحث عن منتجات...' : 'Search products...'}
              className="h-9 w-64 rounded-xl border border-white/[0.08] bg-white/[0.02] pr-9 pl-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all font-medium"
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          <button className="h-9 w-9 rounded-xl flex items-center justify-center bg-white/[0.02] border border-white/[0.04] text-gray-400 hover:text-white hover:bg-white/[0.04] transition-colors">
            <Headphones className="h-5 w-5" />
          </button>

          <button className="h-9 w-9 rounded-xl flex items-center justify-center bg-white/[0.02] border border-white/[0.04] text-gray-400 hover:text-white hover:bg-white/[0.04] transition-colors">
            <MessageCircle className="h-5 w-5" />
          </button>

          <OnlineIndicator />

          <RefreshButton />
          <BackupButton />
          <RestoreButton />

          {/* Notifications */}
          <div className="relative">
            <button className="h-9 w-9 rounded-xl flex items-center justify-center bg-white/[0.02] border border-white/[0.04] text-gray-400 hover:text-white hover:bg-white/[0.04] transition-colors relative" onClick={() => setShowNotifications(!showNotifications)}>
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold shadow-lg shadow-red-500/20 border border-white/[0.1]">
                3
              </span>
            </button>
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/[0.04] border border-transparent hover:border-white/[0.04] transition-colors group"
            >
              <div className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg group-hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-shadow" style={{ backgroundColor: branding.primaryColor || '#0071E3' }}>
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="hidden md:block text-right">
                <p className="text-sm font-bold leading-tight text-white">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-400 font-medium">{isRtl ? getRoleLabelAr(user?.role) : user?.role}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-500 hidden md:block group-hover:text-white transition-colors" />
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                <div className={cn(
                  'absolute top-full mt-2 w-56 rounded-[1.5rem] border border-white/[0.08] bg-[#111114]/95 backdrop-blur-3xl shadow-2xl z-20 py-2 overflow-hidden',
                  isRtl ? 'left-0' : 'right-0'
                )}>
                  <div className="px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                    <p className="text-sm font-bold text-white">{user?.name}</p>
                    <p className="text-xs text-gray-400 font-medium">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors group"
                  >
                    <LogOut className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> {isRtl ? 'تسجيل خروج' : 'Logout'}
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
