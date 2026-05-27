'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MobileLayoutProps {
  children: ReactNode;
  className?: string;
  variant?: 'mobile' | 'desktop' | 'auto';
}

/**
 * Mobile-first layout wrapper
 * - Mobile: max-width 430px centered
 * - Desktop: max-width 1400px centered
 * - Auto: mobile on small screens, desktop on large
 */
export function MobileLayout({ children, className, variant = 'auto' }: MobileLayoutProps) {
  return (
    <div
      className={cn(
        'w-full mx-auto',
        variant === 'mobile' && 'max-w-[430px]',
        variant === 'desktop' && 'max-w-[1400px]',
        variant === 'auto' && 'max-w-[430px] md:max-w-[1400px]',
        'px-4 md:px-6',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Mobile-only wrapper - shows content only on mobile
 */
export function MobileOnly({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('block md:hidden', className)}>{children}</div>;
}

/**
 * Desktop-only wrapper - shows content only on desktop
 */
export function DesktopOnly({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('hidden md:block', className)}>{children}</div>;
}

/**
 * Page header with consistent styling
 */
export function PageHeader({
  title,
  titleAr,
  description,
  descriptionAr,
  actions,
  className,
}: {
  title?: string;
  titleAr: string;
  description?: string;
  descriptionAr?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between mb-6', className)}>
      <div className="min-w-0 flex-1">
        <h1 className="text-xl md:text-2xl font-bold text-foreground">
          {titleAr}
          {title && <span className="text-muted-foreground text-sm mr-2 font-normal">({title})</span>}
        </h1>
        {(descriptionAr || description) && (
          <p className="text-sm text-muted-foreground mt-0.5">{descriptionAr || description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 mr-4 shrink-0">{actions}</div>}
    </div>
  );
}

/**
 * Mobile card with consistent padding
 */
export function MobileCard({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl border bg-card text-card-foreground shadow-sm p-4',
        'card-hover',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
}
