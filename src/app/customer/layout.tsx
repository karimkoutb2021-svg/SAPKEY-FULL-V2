'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Home, ShoppingBag, Package, Wallet, Bot } from 'lucide-react';

const supabase = createClient();

const navItems = [
  { id: 'dashboard', label: 'الرئيسية', icon: Home, href: '/' },
  { id: 'catalog', label: 'المتجر', icon: ShoppingBag, href: '/shop' },
  { id: 'orders', label: 'طلباتي', icon: Package, href: '/customer/orders' },
  { id: 'wallet', label: 'المحفظة', icon: Wallet, href: '/wallet' },
  { id: 'assistant', label: 'المساعد', icon: Bot, href: '/customer/assistant' },
];

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [ordersCount, setOrdersCount] = useState(0);

  const isLoginPage = pathname === '/customer/login' || pathname === '/login';

  useEffect(() => {
    const channel = supabase.channel('customer-nav')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'preparing').then(r => setOrdersCount(r.count || 0));
      })
      .subscribe();
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'preparing').then(r => setOrdersCount(r.count || 0));
    return () => { channel.unsubscribe(); };
  }, []);

  return (
    <div className={cn("min-h-screen flex flex-col", isLoginPage ? "" : "bg-[#0A0A0C] text-white")} dir="rtl">
      <main className={cn("flex-1", isLoginPage ? "" : "pb-24")}>
        {children}
      </main>

      {/* Bottom Tab Bar - Apple Style Glassmorphism */}
      {!isLoginPage && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#0A0A0C]/80 backdrop-blur-2xl border-t border-gray-200 dark:border-white/[0.06] safe-area-bottom pb-safe">
          <div className="flex items-center justify-around h-16 px-2 max-w-md mx-auto">
            {navItems.map(item => {
              const active = pathname === item.href || (item.href !== '/' && item.href !== '/shop' && pathname?.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link key={item.id} href={item.href}
                  className={cn('flex flex-col items-center gap-1 w-16 h-14 justify-center rounded-2xl transition-all duration-300 relative',
                    active ? 'bg-emerald-50 dark:bg-white/[0.08]' : 'hover:bg-gray-50 dark:hover:bg-white/[0.04]'
                  )}>
                  <Icon className={cn('w-5 h-5 transition-transform duration-300', active ? 'scale-110 text-emerald-500' : 'text-gray-400 dark:text-white/40')} />
                  <span className={cn('text-[10px] font-bold transition-colors duration-300', active ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-white/40')}>{item.label}</span>
                  {item.id === 'orders' && ordersCount > 0 && (
                    <span className="absolute top-1 right-2 min-w-[16px] h-[16px] flex items-center justify-center text-[9px] font-black text-white bg-red-500 rounded-full px-1 shadow-sm shadow-red-500/30">
                      {ordersCount > 9 ? '9+' : ordersCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
