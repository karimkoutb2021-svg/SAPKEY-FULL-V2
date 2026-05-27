'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRouter, usePathname } from 'next/navigation';
import { PageLoader } from '@/components/layout/page-loader';
import { createClient } from '@/lib/supabase/client';
import { getDefaultPermissions } from '@/lib/permissions';
import type { AppUser, UserRole } from '@/types';

const publicRoutes = [
  '/', '/login', '/register', '/forgot-password', '/reset-password', '/change-password',
  '/shop', '/customer/login', '/offers', '/favorites', '/cart', '/checkout',
  '/guides/cashier', '/guides/customer', '/guides/manager', '/guides/developer',
  '/about', '/contact', '/faq', '/privacy', '/terms', '/portfolio',
  '/system-identity', '/careers', '/tracking', '/returns', '/wallet', '/loyalty', '/orders',
];

const adminEmail = 'sapkeyglobal@gmail.com';

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, initFromSession } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initFromSession();
    // Try to restore Supabase session
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !useAuthStore.getState().isAuthenticated) {
        const email = session.user.email || '';
        const meta = session.user.user_metadata || {};
        const user: AppUser = {
          id: session.user.id,
          email,
          name: (meta.full_name as string) || email.split('@')[0],
          nameAr: (meta.full_name_ar as string) || email.split('@')[0],
          phone: (meta.phone as string) || '',
          role: (meta.role as UserRole) || 'customer',
          branchIds: ['default'],
          defaultBranchId: 'default',
          permissions: getDefaultPermissions((meta.role as UserRole) || 'customer'),
          authMethod: 'email',
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        useAuthStore.setState({ user, isAuthenticated: true });
      }
      setReady(true);
    }).catch(() => setReady(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ready) return;
    const isPublic = publicRoutes.includes(pathname) || pathname.startsWith('/shop');
    if (!isAuthenticated && !isPublic) {
      router.replace('/login');
    }
  }, [isAuthenticated, pathname, router, ready]);

  if (!ready) return <PageLoader />;

  return <>{children}</>;
}
