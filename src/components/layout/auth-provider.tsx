'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRouter, usePathname } from 'next/navigation';
import { PageLoader } from '@/components/layout/page-loader';
import { createClient } from '@/lib/supabase/client';
import { getDefaultPermissions } from '@/lib/permissions';
import type { AppUser, UserRole } from '@/types';
import toast from 'react-hot-toast';

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
    
    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const email = session.user.email || '';
          const meta = session.user.user_metadata || {};
          const isGoogleOAuth = session.user.app_metadata?.provider === 'google' || session.user.identities?.some(id => id.provider === 'google');
          
          // Check if user already exists in 'users' table
          const { data: dbUser } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
            
          if (dbUser) {
            // Google login is strictly restricted to customer role!
            if (isGoogleOAuth && dbUser.role !== 'customer') {
              await supabase.auth.signOut();
              useAuthStore.getState().logout();
              toast.error('عذراً، تسجيل الدخول بحساب جوجل متاح للعملاء فقط!');
              setReady(true);
              return;
            }
            
            // Sync store from database values
            const user: AppUser = {
              id: dbUser.id,
              email: dbUser.email,
              name: dbUser.full_name_en || email.split('@')[0],
              nameAr: dbUser.full_name_ar || email.split('@')[0],
              phone: dbUser.phone || '',
              role: dbUser.role as UserRole,
              branchIds: ['default'],
              defaultBranchId: 'default',
              permissions: getDefaultPermissions(dbUser.role as UserRole),
              authMethod: isGoogleOAuth ? 'google' : 'email',
              status: dbUser.is_active !== false ? 'active' : 'inactive',
              createdAt: dbUser.created_at ? new Date(dbUser.created_at).getTime() : Date.now(),
              updatedAt: Date.now(),
            };
            useAuthStore.setState({ user, isAuthenticated: true });
          } else {
            // If they don't exist in 'users' table and logged in via Google, auto-create their profile
            if (isGoogleOAuth) {
              const fullName = meta.full_name || email.split('@')[0];
              
              // 1. Create in 'users' table
              await supabase.from('users').insert({
                id: session.user.id,
                email: email,
                full_name_en: fullName,
                full_name_ar: fullName,
                role: 'customer',
                is_active: true
              });
              
              // 2. Create in 'customers' table if it exists
              try {
                await supabase.from('customers').insert({
                  id: session.user.id,
                  name: fullName,
                  email: email,
                  phone: meta.phone || ''
                });
              } catch (e) {
                console.error('Customers table insert error:', e);
              }
              
              const user: AppUser = {
                id: session.user.id,
                email,
                name: fullName,
                nameAr: fullName,
                phone: meta.phone || '',
                role: 'customer',
                branchIds: ['default'],
                defaultBranchId: 'default',
                permissions: getDefaultPermissions('customer'),
                authMethod: 'google',
                status: 'active',
                createdAt: Date.now(),
                updatedAt: Date.now(),
              };
              useAuthStore.setState({ user, isAuthenticated: true });
            } else {
              // Legacy fallback
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
          }
        }
      } catch (err) {
        console.error('Error during session check:', err);
      } finally {
        setReady(true);
      }
    }
    
    checkSession();
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
