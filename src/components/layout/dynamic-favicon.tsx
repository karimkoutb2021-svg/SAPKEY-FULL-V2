'use client';

import { useBrandingStore } from '@/lib/store/branding-store';
import { useEffect } from 'react';

export function DynamicFavicon() {
  const { branding } = useBrandingStore();

  useEffect(() => {
    if (branding.favicon) {
      // Find the existing favicon link or create a new one
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = branding.favicon;
    }
  }, [branding.favicon]);

  return null;
}
