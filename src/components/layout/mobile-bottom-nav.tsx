'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/store/auth-store';
import { Home, ShoppingCart, Package, BarChart3, Settings, Users, Boxes, Truck, Wallet } from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  Home, ShoppingCart, Package, BarChart3, Settings, Users, Boxes, Truck, Wallet,
};

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  // Determine core actions based on role
  const getCoreActions = () => {
    const role = user?.role;
    switch (role) {
      case 'cashier':
        return [
          { href: '/pos', icon: 'ShoppingCart', label: 'نقطة البيع' },
          { href: '/orders', icon: 'Package', label: 'الطلبات' },
          { href: '/customers', icon: 'Users', label: 'العملاء' },
          { href: '/settings', icon: 'Settings', label: 'الإعدادات' },
        ];
      case 'manager':
      case 'admin':
        return [
          { href: '/dashboard', icon: 'Home', label: 'الرئيسية' },
          { href: '/pos', icon: 'ShoppingCart', label: 'المبيعات' },
          { href: '/inventory', icon: 'Boxes', label: 'المخزون' },
          { href: '/analytics', icon: 'BarChart3', label: 'التحليلات' },
        ];
      case 'customer':
        return [
          { href: '/shop', icon: 'Home', label: 'المتجر' },
          { href: '/orders', icon: 'Package', label: 'طلباتي' },
          { href: '/wallet', icon: 'Wallet', label: 'المحفظة' },
          { href: '/customer', icon: 'Settings', label: 'حسابي' },
        ];
      case 'delivery':
        return [
          { href: '/delivery', icon: 'Truck', label: 'التوصيل' },
          { href: '/orders', icon: 'Package', label: 'الطلبات' },
          { href: '/tracking', icon: 'Home', label: 'التتبع' },
          { href: '/settings', icon: 'Settings', label: 'الإعدادات' },
        ];
      default:
        return [
          { href: '/dashboard', icon: 'Home', label: 'الرئيسية' },
          { href: '/shop', icon: 'ShoppingCart', label: 'المتجر' },
          { href: '/orders', icon: 'Package', label: 'الطلبات' },
          { href: '/settings', icon: 'Settings', label: 'الإعدادات' },
        ];
    }
  };

  const actions = getCoreActions();

  return (
    <nav className="mobile-bottom-nav" role="navigation" aria-label="Mobile navigation">
      {actions.map((action) => {
        const Icon = iconMap[action.icon] || Home;
        const isActive = pathname === action.href || pathname.startsWith(action.href + '/');
        return (
          <Link
            key={action.href}
            href={action.href}
            className={cn(
              'mobile-bottom-nav-item',
              isActive ? 'active' : ''
            )}
          >
            <Icon className="w-[22px] h-[22px]" />
            <span>{action.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
