'use client';

import { type ReactNode } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import type { UserRole, Permission } from '@/types';
import { hasPermission, hasAnyPermission } from '@/lib/permissions';

interface RoleGuardProps {
  children: ReactNode;
  roles?: UserRole[];
  permissions?: Permission[];
  fallback?: ReactNode;
}

export function RoleGuard({ children, roles, permissions, fallback }: RoleGuardProps) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  if (!user) return null;

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m9.364-7.364A9 9 0 1112 3a9 9 0 017.364 4.636z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">غير مصرح بالوصول</h2>
          <p className="text-muted-foreground">ليس لديك الصلاحية للوصول إلى هذه الصفحة</p>
        </div>
      </div>
    );
  }

  if (permissions && permissions.length > 0) {
    const hasAccess = hasAnyPermission(user.permissions, permissions);
    if (!hasAccess) {
      if (fallback) return <>{fallback}</>;
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">صلاحية غير كافية</h2>
            <p className="text-muted-foreground">تحتاج إلى صلاحية أعلى للوصول إلى هذه الميزة</p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}

export function Can({
  children,
  permission,
  permissions,
  fallback = null,
}: {
  children: ReactNode;
  permission?: Permission;
  permissions?: Permission[];
  fallback?: ReactNode;
}) {
  const { user } = useAuthStore();
  if (!user) return null;

  if (permission && hasPermission(user.permissions, permission)) {
    return <>{children}</>;
  }
  if (permissions && hasAnyPermission(user.permissions, permissions)) {
    return <>{children}</>;
  }
  return <>{fallback}</>;
}
