'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { notificationService } from '@/lib/supabase/services/notifications';
import type { ERPNotification, NotificationType } from '@/types/erp';
import Link from 'next/link';

const supabase = createClient();

const NOTIF_ICONS: Record<string, { icon: string; bg: string; border: string; text: string }> = {
  due_date: { icon: '📅', bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
  overdue: { icon: '⚠️', bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
  approval: { icon: '✅', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
  low_stock: { icon: '📦', bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
  payment_reminder: { icon: '💳', bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400' },
  balance_alert: { icon: '💰', bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400' },
  expiry_alert: { icon: '⏰', bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
  return_request: { icon: '↩️', bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400' },
  invoice_cancelled: { icon: '🗑️', bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-500' },
  invoice_modified: { icon: '✏️', bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-500' },
  cash_threshold: { icon: '🏦', bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-500' },
  purchase_order: { icon: '🛒', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400' },
  transfer_alert: { icon: '🔄', bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400' },
  system_alert: { icon: '🛡️', bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-400' },
};

type FilterTab = 'all' | 'unread' | 'pending' | 'low_stock' | 'expiry_alert' | 'return_request' | 'cash_threshold';

type SortOrder = 'newest' | 'oldest';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<ERPNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (filter === 'unread') params.is_read = false;
      else if (filter === 'pending') params.requires_approval = true;
      else if (filter !== 'all') params.type = filter;
      const { data } = await notificationService.getAll(params);
      if (data) {
        const sorted = [...data].sort((a, b) =>
          sortOrder === 'newest'
            ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        setNotifications(sorted);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filter, sortOrder]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  useEffect(() => {
    const channel = supabase
      .channel('notif-page')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => { fetchNotifications(); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications' }, () => { fetchNotifications(); })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [fetchNotifications]);

  async function handleMarkRead(id: string) {
    await notificationService.markAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n));
  }

  async function handleMarkAllRead() {
    await notificationService.markAllAsRead('*');
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
  }

  async function handleDeleteAllRead() {
    await notificationService.deleteAllRead('*');
    setNotifications(prev => prev.filter(n => !n.is_read));
  }

  async function handleApproval(notif: ERPNotification, approved: boolean) {
    await supabase.from('notifications').update({
      approved,
      approved_at: new Date().toISOString(),
      approved_by: 'manager',
      is_read: true,
      read_at: new Date().toISOString(),
    }).eq('id', notif.id);
    fetchNotifications();
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const filtered = notifications;

  const tabs: { key: FilterTab; label: string; icon: string }[] = [
    { key: 'all', label: 'الكل', icon: '🔔' },
    { key: 'unread', label: 'غير مقروء', icon: '📩' },
    { key: 'pending', label: 'طلبات الموافقة', icon: '⏳' },
    { key: 'low_stock', label: 'المخزون', icon: '📦' },
    { key: 'expiry_alert', label: 'الصلاحية', icon: '⏰' },
    { key: 'return_request', label: 'المرتجعات', icon: '↩️' },
    { key: 'cash_threshold', label: 'الكاش', icon: '🏦' },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0C] p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">مركز الإشعارات</h1>
          <p className="text-sm text-white/50 mt-1">إدارة جميع التنبيهات والإشعارات</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/manager/notifications/settings" className="px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/70 hover:bg-white/[0.08] transition-colors">
            الإعدادات
          </Link>
          <button onClick={handleMarkAllRead} className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/30 transition-colors">
            تحديد الكل مقروء
          </button>
          <button onClick={handleDeleteAllRead} className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition-colors">
            حذف المقروء
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-colors ${
              filter === tab.key
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-white/[0.04] text-white/60 border border-white/[0.06] hover:bg-white/[0.08]'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
        <div className="mr-auto flex items-center gap-2">
          <select value={sortOrder} onChange={e => setSortOrder(e.target.value as SortOrder)}
            className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/70">
            <option value="newest">الأحدث</option>
            <option value="oldest">الأقدم</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white/[0.03] rounded-xl h-20 border border-white/[0.06]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🔔</div>
          <p className="text-white/40 text-lg">لا توجد إشعارات</p>
          <p className="text-white/30 text-sm mt-1">سيتم عرض الإشعارات هنا عند ورودها</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(notif => {
            const cfg = NOTIF_ICONS[notif.type] || NOTIF_ICONS.system_alert;
            return (
              <div key={notif.id}
                className={`rounded-xl border transition-all cursor-pointer ${
                  notif.is_read ? 'bg-white/[0.02] border-white/[0.04]' : 'bg-white/[0.04] border-white/[0.08]'
                } ${expandedId === notif.id ? 'ring-1 ring-emerald-500/30' : ''}`}
                onClick={() => setExpandedId(expandedId === notif.id ? null : notif.id)}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                      <input type="checkbox" checked={selectedIds.has(notif.id)}
                        onChange={() => toggleSelect(notif.id)}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 accent-emerald-500"
                        onClick={e => e.stopPropagation()}
                      />
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${cfg.bg} ${cfg.border} border`}>{cfg.icon}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {!notif.is_read && <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />}
                        <p className={`text-sm font-medium truncate ${notif.is_read ? 'text-white/60' : 'text-white'}`}>{notif.title}</p>
                        {notif.requires_approval && notif.approved === null && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">معلق</span>
                        )}
                        {notif.requires_approval && notif.approved !== null && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                            notif.approved ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'
                          }`}>{notif.approved ? 'تمت الموافقة' : 'مرفوض'}</span>
                        )}
                      </div>
                      <p className="text-xs text-white/50 mt-0.5 line-clamp-2">{notif.message}</p>
                      <p className="text-[10px] text-white/30 mt-1.5 font-mono">{new Date(notif.created_at).toLocaleString('ar-EG')}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {notif.requires_approval && notif.approved === null && (
                        <>
                          <button onClick={e => { e.stopPropagation(); handleApproval(notif, true); }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs hover:bg-emerald-500/30">موافقة</button>
                          <button onClick={e => { e.stopPropagation(); handleApproval(notif, false); }}
                            className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs hover:bg-red-500/30">رفض</button>
                        </>
                      )}
                      {!notif.is_read && (
                        <button onClick={e => { e.stopPropagation(); handleMarkRead(notif.id); }}
                          className="px-3 py-1.5 rounded-lg bg-white/[0.04] text-white/50 text-xs hover:bg-white/[0.08]">مقروء</button>
                      )}
                      {notif.action_url && (
                        <Link href={notif.action_url} onClick={e => e.stopPropagation()}
                          className="px-3 py-1.5 rounded-lg bg-white/[0.04] text-emerald-400 text-xs hover:bg-white/[0.08]">عرض</Link>
                      )}
                      <svg className={`w-4 h-4 text-white/30 transition-transform ${expandedId === notif.id ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                {expandedId === notif.id && (
                  <div className="px-4 pb-4 border-t border-white/[0.06] pt-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-white/[0.03] rounded-lg p-3">
                        <p className="text-[10px] text-white/40">النوع</p>
                        <p className="text-xs text-white/80 mt-0.5">{notif.type}</p>
                      </div>
                      <div className="bg-white/[0.03] rounded-lg p-3">
                        <p className="text-[10px] text-white/40">المعرف</p>
                        <p className="text-xs text-white/50 mt-0.5 font-mono">{notif.id.slice(0, 8)}...</p>
                      </div>
                      <div className="bg-white/[0.03] rounded-lg p-3">
                        <p className="text-[10px] text-white/40">يتطلب موافقة</p>
                        <p className="text-xs text-white/80 mt-0.5">{notif.requires_approval ? 'نعم' : 'لا'}</p>
                      </div>
                      <div className="bg-white/[0.03] rounded-lg p-3">
                        <p className="text-[10px] text-white/40">الحالة</p>
                        <p className="text-xs text-white/80 mt-0.5">{notif.is_read ? 'مقروءة' : 'جديدة'}</p>
                      </div>
                    </div>
                    {notif.metadata && (
                      <div className="mt-3 bg-white/[0.02] rounded-lg p-3">
                        <p className="text-[10px] text-white/40 mb-1">بيانات إضافية</p>
                        <pre className="text-xs text-white/50 font-mono whitespace-pre-wrap">{JSON.stringify(notif.metadata, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
