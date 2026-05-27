'use client';

import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

export function BackButton({ href, label }: { href?: string; label?: string }) {
  const router = useRouter();

  return (
    <button
      onClick={() => (href ? router.push(href) : router.back())}
      className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white transition-colors mb-3"
    >
      <ChevronRight className="h-4 w-4" />
      {label || 'رجوع'}
    </button>
  );
}
