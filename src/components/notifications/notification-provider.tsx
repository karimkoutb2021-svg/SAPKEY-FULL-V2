'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ERPNotification } from '@/types/erp';

const supabase = createClient();

interface NotificationContextType {
  notifications: ERPNotification[];
  unreadCount: number;
  pendingApprovals: ERPNotification[];
  showToast: boolean;
  toastNotification: ERPNotification | null;
  dismissToast: () => void;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

const TOAST_DURATION = 5000;

export function NotificationProvider({ children, userId }: { children: ReactNode; userId?: string }) {
  const [notifications, setNotifications] = useState<ERPNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState<ERPNotification[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [toastNotification, setToastNotification] = useState<ERPNotification | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        setNotifications(data as ERPNotification[]);
        setUnreadCount(data.filter(n => !n.is_read).length);
        setPendingApprovals(data.filter(n => n.requires_approval && n.approved === null));
      }
    } catch (e) {
      console.error('Failed to fetch notifs', e);
    }
  }, []);

  useEffect(() => {
    refresh();

    const channel = supabase
      .channel('notifications-global')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      }, (payload) => {
        const notif = payload.new as ERPNotification;
        setNotifications(prev => [notif, ...prev]);
        if (!notif.is_read) {
          setUnreadCount(c => c + 1);
        }
        if (notif.requires_approval && notif.approved === null) {
          setPendingApprovals(prev => [notif, ...prev]);
        }
        setToastNotification(notif);
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
          setToastNotification(null);
        }, TOAST_DURATION);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
      }, (payload) => {
        const updated = payload.new as ERPNotification;
        setNotifications(prev => prev.map(n => n.id === updated.id ? updated : n));
        if (updated.is_read) {
          setUnreadCount(c => Math.max(0, c - 1));
        }
        if (updated.requires_approval && updated.approved !== null) {
          setPendingApprovals(prev => prev.filter(n => n.id !== updated.id));
        }
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [refresh]);

  const dismissToast = useCallback(() => {
    setShowToast(false);
    setToastNotification(null);
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n));
    setUnreadCount(c => Math.max(0, c - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
    setUnreadCount(0);
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, pendingApprovals,
      showToast, toastNotification, dismissToast,
      refresh, markAsRead, markAllAsRead,
    }}>
      {children}
      {showToast && toastNotification && (
        <div className="fixed bottom-6 left-6 z-[60] max-w-sm animate-slide-up">
          <div className="bg-[#111114] border border-white/[0.08] rounded-xl p-4 shadow-2xl backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 mt-2 rounded-full shrink-0 bg-emerald-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{toastNotification.title}</p>
                <p className="text-xs text-white/60 mt-0.5 line-clamp-2">{toastNotification.message}</p>
              </div>
              <button onClick={dismissToast} className="text-white/40 hover:text-white/80 shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
