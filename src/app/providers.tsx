'use client';

import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { AuthProvider } from '@/components/layout/auth-provider';
import { BrandingProvider } from '@/components/layout/branding-provider';
import { PWAProvider } from '@/components/layout/pwa-provider';
import { SWUpdateProvider } from '@/components/layout/sw-update';
import { VersionCheckWrapper } from '@/components/update/version-check-wrapper';
import { FAB } from '@/components/layout/fab';
import { DynamicAppIcon } from '@/components/layout/dynamic-app-icon';
import { Toaster } from 'react-hot-toast';
import { useState } from 'react';
import { SystemInit } from '@/components/layout/system-init';
import { OfflineSyncProvider } from '@/components/layout/offline-sync-provider';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60 * 1000, retry: 1, refetchOnWindowFocus: false },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrandingProvider>
          <AuthProvider>
            <OfflineSyncProvider>
              <PWAProvider>
                <SWUpdateProvider>
                  <VersionCheckWrapper>
                    <SystemInit />
                    <DynamicAppIcon />
                    {children}
                    <FAB />
                  </VersionCheckWrapper>
                </SWUpdateProvider>
                <Toaster
                  position="top-center"
                  toastOptions={{
                    duration: 3000,
                    className: 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-gray-100 dark:border-slate-800 shadow-xl rounded-2xl font-semibold text-[13px] px-5 py-3.5',
                    success: {
                      iconTheme: { primary: '#10B981', secondary: '#FFFFFF' },
                    },
                    error: {
                      iconTheme: { primary: '#EF4444', secondary: '#FFFFFF' },
                    },
                    loading: {
                      iconTheme: { primary: '#3B82F6', secondary: '#FFFFFF' },
                    },
                  }}
                />
              </PWAProvider>
            </OfflineSyncProvider>
          </AuthProvider>
        </BrandingProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
