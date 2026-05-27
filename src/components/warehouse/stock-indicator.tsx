'use client';

import { cn } from '@/lib/utils';

interface StockIndicatorProps {
  current: number;
  min: number;
  max: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function StockIndicator({ current, min, max, showLabel = true, size = 'sm' }: StockIndicatorProps) {
  const percentage = Math.min((current / max) * 100, 100);
  const isLow = current <= min;
  const isOut = current <= 0;
  const isOver = current > max;

  const barHeight = size === 'sm' ? 'h-1.5' : size === 'md' ? 'h-2' : 'h-3';

  const getColor = () => {
    if (isOut) return 'bg-red-500';
    if (isLow) return 'bg-amber-500';
    if (isOver) return 'bg-purple-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="space-y-1">
      <div className={cn('w-full rounded-full bg-muted overflow-hidden', barHeight)}>
        <div
          className={cn(barHeight, 'rounded-full transition-all duration-500', getColor())}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{current} {isLow && '(منخفض)'} {isOut && '(نفذ)'}</span>
          <span>الحد: {min}</span>
        </div>
      )}
    </div>
  );
}
