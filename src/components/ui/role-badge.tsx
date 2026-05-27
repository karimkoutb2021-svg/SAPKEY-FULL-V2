'use client';

import { cn } from '@/lib/utils';
import { ROLES } from '@/types';
import type { UserRole } from '@/types';

export function RoleBadge({ role, className }: { role: UserRole; className?: string }) {
  const info = ROLES[role];
  if (!info) return null;
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', info.color, className)}>
      {info.labelAr}
    </span>
  );
}
