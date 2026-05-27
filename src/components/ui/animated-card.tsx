'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  tap?: boolean;
}

export function AnimatedCard({ children, className, hover = true, tap = true }: AnimatedCardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -2, boxShadow: '0 8px 25px rgba(0,0,0,0.08)' } : undefined}
      whileTap={tap ? { scale: 0.98 } : undefined}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn('rounded-xl border bg-card text-card-foreground shadow-sm', className)}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedButton({
  children,
  className,
  onClick,
  disabled,
  type,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className={className}
      onClick={onClick}
      disabled={disabled}
      type={type}
    >
      {children}
    </motion.button>
  );
}
