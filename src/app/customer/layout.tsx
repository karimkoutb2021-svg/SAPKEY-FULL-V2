'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

const navItems = [
  { id: 'dashboard', label: 'الرئيسية', icon: '🏠', href: '/customer' },
  { id: 'catalog', label: 'المتجر', icon: '🛍️', href: '/customer/catalog' },
  { id: 'orders', label: 'طلباتي', icon: '📦', href: '/customer/orders' },
  { id: 'wallet', label: 'المحفظة', icon: '💰', href: '/customer/wallet' },
  { id: 'assistant', label: 'المساعد', icon: '🤖', href: '/customer/assistant' },
];

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [ordersCount, setOrdersCount] = useState(0);

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
    <div className="min-h-screen bg-[#0A0A0C] text-white flex flex-col" dir="rtl">
      <main className="flex-1 pb-20">
        {children}
      </main>

      {/* Bottom Tab Bar - Apple Style Glassmorphism */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0C]/80 backdrop-blur-2xl border-t border-white/[0.06] safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
          {navItems.map(item => {
            const active = pathname === item.href || (item.href !== '/customer' && pathname?.startsWith(item.href));
            return (
              <Link key={item.id} href={item.href}
                className={cn('flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all duration-200 relative',
                  active ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'
                )}>
                <span className={cn('text-xl transition-transform', active ? 'scale-110' : '')}>{item.icon}</span>
                <span className={cn('text-[10px] font-medium', active ? 'text-emerald-400' : 'text-white/40')}>{item.label}</span>
                {item.id === 'orders' && ordersCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] flex items-center justify-center text-[8px] font-bold text-white bg-emerald-500 rounded-full px-1">
                    {ordersCount > 9 ? '9+' : ordersCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
