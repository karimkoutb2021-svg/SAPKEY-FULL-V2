'use client';

import { useCallback } from 'react';
import { useVersionCheck } from '@/hooks/use-version-check';
import { ForceUpdateModal } from '@/components/update/force-update-modal';

export function VersionCheckWrapper({ children }: { children: React.ReactNode }) {
  const { updateAvailable, reload } = useVersionCheck({ intervalMs: 10000 });

  const handleReload = useCallback(() => {
    if ('caches' in window) {
      caches.keys().then((names) => names.forEach((name) => caches.delete(name)));
    }
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_ALL_CACHES' });
    }
    sessionStorage.removeItem('app-build-id');
    sessionStorage.setItem('force-reload', 'true');
    window.location.reload();
  }, []);

  return (
    <>
      {children}
      <ForceUpdateModal show={updateAvailable} onReload={handleReload} />
    </>
  );
}
