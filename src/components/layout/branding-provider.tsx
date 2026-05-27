'use client';

import { useEffect, type ReactNode } from 'react';
import { useBrandingStore } from '@/lib/store/branding-store';

export function BrandingProvider({ children }: { children: ReactNode }) {
  const branding = useBrandingStore((s) => s.branding);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', branding.primaryColor);
    root.style.setProperty('--brand-secondary', branding.secondaryColor);
    root.style.setProperty('--brand-bg', branding.backgroundColor);
    root.style.setProperty('--brand-text', branding.textColor);

    if (branding.logo) {
      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage) ogImage.setAttribute('content', branding.logo);
    }

    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (branding.favicon && link) {
      link.href = branding.favicon;
    }

    document.title = branding.storeName
      ? `${branding.storeName} - ${branding.slogan}`
      : 'SuperMarket ERP';
  }, [branding]);

  return <>{children}</>;
}
