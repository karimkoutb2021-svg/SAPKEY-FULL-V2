'use client';

import { useEffect, type ReactNode } from 'react';
import { useAppStore } from '@/lib/store/app-store';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { language } = useAppStore();

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  return <>{children}</>;
}
