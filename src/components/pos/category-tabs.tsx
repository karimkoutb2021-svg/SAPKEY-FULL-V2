'use client';

import { cn } from '@/lib/utils';

interface Category {
  id: string;
  nameAr: string;
  icon?: string;
}

interface CategoryTabsProps {
  categories: Category[];
  active: string | null;
  onSelect: (id: string | null) => void;
}

export function CategoryTabs({ categories, active, onSelect }: CategoryTabsProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none touch-auto">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all touch-none select-none',
          active === null
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'bg-muted hover:bg-accent text-muted-foreground'
        )}
      >
        الكل
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(active === cat.id ? null : cat.id)}
          className={cn(
            'px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all touch-none select-none',
            active === cat.id
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted hover:bg-accent text-muted-foreground'
          )}
        >
          {cat.icon && <span className="ml-1">{cat.icon}</span>}
          {cat.nameAr}
        </button>
      ))}
    </div>
  );
}
