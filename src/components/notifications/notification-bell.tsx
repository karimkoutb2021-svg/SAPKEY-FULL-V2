'use client';

import { useNotifications } from './notification-provider';
import Link from 'next/link';

export function NotificationBell() {
  const { unreadCount, pendingApprovals } = useNotifications();

  return (
    <Link
      href="/manager/notifications"
      className="relative p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors"
      title="مركز الإشعارات"
    >
      <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-1 shadow-lg">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
      {pendingApprovals.length > 0 && (
        <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-[#0A0A0C] shadow-lg" title={`${pendingApprovals.length} طلب موافقة معلق`} />
      )}
    </Link>
  );
}
