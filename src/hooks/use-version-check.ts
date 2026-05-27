'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface VersionInfo {
  buildId: string;
  timestamp: string;
  version: string;
}

function getMetaBuildId(): string | null {
  const meta = document.querySelector('meta[name="build-id"]');
  return meta?.getAttribute('content') || null;
}

export function useVersionCheck({ intervalMs = 10000, enabled = true }: { intervalMs?: number; enabled?: boolean } = {}) {
  const [clientVersion, setClientVersion] = useState<VersionInfo | null>(null);
  const [serverVersion, setServerVersion] = useState<VersionInfo | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [checking, setChecking] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Step 1: On mount, compare stored buildId (localStorage) with current page buildId
  useEffect(() => {
    if (!enabled) return;

    // Get the buildId from the HTML meta tag (this is what the current page was built with)
    const currentBuildId = getMetaBuildId();

    // Get the buildId from the last time the user visited (stored in localStorage)
    const storedBuildId = localStorage.getItem('app-build-id');

    // Load current version.json
    fetch('/version.json', {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    })
      .then((r) => r.json())
      .then((data) => {
        setClientVersion(data);

        // If there's a stored buildId and it differs from the current page's buildId,
        // it means the user has an old cached version
        if (storedBuildId && currentBuildId && storedBuildId !== currentBuildId) {
          console.log(`[VersionCheck] Cached version detected: stored=${storedBuildId}, current=${currentBuildId}`);
          setUpdateAvailable(true);
        }

        // Always update localStorage with the current buildId
        if (currentBuildId) {
          localStorage.setItem('app-build-id', currentBuildId);
        }
      })
      .catch(() => {});
  }, [enabled]);

  // Step 2: Periodically check server version
  const checkServerVersion = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/version', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setServerVersion(data);

        // Compare server version with stored client version
        const storedBuildId = localStorage.getItem('app-build-id');
        if (storedBuildId && data.buildId && data.buildId !== storedBuildId) {
          console.log(`[VersionCheck] Server update available: stored=${storedBuildId}, server=${data.buildId}`);
          setUpdateAvailable(true);
        }
      }
    } catch {
      // Network error - likely offline
    } finally {
      setChecking(false);
    }
  }, []);

  // Step 3: Set up polling interval
  useEffect(() => {
    if (!enabled) return;

    const timer = setTimeout(() => checkServerVersion(), 3000);
    intervalRef.current = setInterval(checkServerVersion, intervalMs);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkServerVersion();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(timer);
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, intervalMs, checkServerVersion]);

  // Step 4: Listen for service worker updates
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'SW_UPDATED') {
        console.log('[VersionCheck] Service worker updated');
        setUpdateAvailable(true);
      }
    };

    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, []);

  const reload = useCallback(() => {
    if ('caches' in window) {
      caches.keys().then((names) => names.forEach((name) => caches.delete(name)));
    }
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_ALL_CACHES' });
    }
    localStorage.removeItem('app-build-id');
    sessionStorage.setItem('force-reload', 'true');
    window.location.reload();
  }, []);

  return { clientVersion, serverVersion, updateAvailable, checking, reload };
}
