import { createClient } from '@/lib/supabase/client';
import type { ERPNotification, NotificationType } from '@/types/erp';

const supabase = createClient();

export const notificationService = {
  async getAll(params?: {
    user_id?: string;
    type?: NotificationType;
    is_read?: boolean;
    limit?: number;
    offset?: number;
  }) {
    let query = supabase.from('notifications').select('*', { count: 'exact' });

    if (params?.user_id) {
      query = query.eq('user_id', params.user_id);
    }
    if (params?.type) {
      query = query.eq('type', params.type);
    }
    if (params?.is_read !== undefined) {
      query = query.eq('is_read', params.is_read);
    }
    if (params?.limit) {
      query = query.limit(params.limit);
    }
    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
    }

    const { data, error, count } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data as ERPNotification[], count };
  },

  async getUnreadCount(userId: string) {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  },

  async create(notification: {
    type: NotificationType;
    title: string;
    message: string;
    user_id?: string;
    supplier_id?: string;
    invoice_id?: string;
    action_url?: string;
    requires_approval?: boolean;
    metadata?: Record<string, any>;
    shift_id?: string;
    approved?: boolean | null;
    approved_at?: string | null;
    approved_by?: string | null;
  }) {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single();

    if (error) throw error;
    return data as ERPNotification;
  },

  async markAsRead(id: string) {
    const { data, error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as ERPNotification;
  },

  async markAllAsRead(userId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return true;
  },

  async deleteAllRead(userId: string) {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .eq('is_read', true);

    if (error) throw error;
    return true;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  async createBulk(notifications: Array<{
    type: NotificationType;
    title: string;
    message: string;
    user_id?: string;
    supplier_id?: string;
    invoice_id?: string;
    action_url?: string;
    requires_approval?: boolean;
    metadata?: Record<string, any>;
    shift_id?: string;
  }>) {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select();

    if (error) throw error;
    return data as ERPNotification[];
  },

  subscribeToNotifications(userId: string, callback: (notification: ERPNotification) => void) {
    return supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        callback(payload.new as ERPNotification);
      })
      .subscribe();
  }
};

export const reminderService = {
  async createDueReminders() {
    const today = new Date().toISOString().split('T')[0];
    const { data: dueInvoices } = await supabase
      .from('purchase_invoices')
      .select('id, invoice_number, due_date, supplier_id, total, remaining_amount')
      .eq('status', 'approved')
      .lte('due_date', today);

    if (dueInvoices && dueInvoices.length > 0) {
      const notifications = dueInvoices.map(inv => ({
        type: 'due_date' as NotificationType,
        title: 'موعد استحقاق الفاتورة',
        message: `فاتورة ${inv.invoice_number} مستحقة اليوم`,
        supplier_id: inv.supplier_id,
        invoice_id: inv.id,
        action_url: `/invoices/${inv.id}`
      }));

      await notificationService.createBulk(notifications);
    }
  },

  async createOverdueReminders() {
    const today = new Date().toISOString().split('T')[0];
    const { data: overdueInvoices } = await supabase
      .from('purchase_invoices')
      .select('id, invoice_number, due_date, supplier_id, total, remaining_amount')
      .eq('status', 'approved')
      .lt('due_date', today);

    if (overdueInvoices && overdueInvoices.length > 0) {
      const notifications = overdueInvoices.map(inv => ({
        type: 'overdue' as NotificationType,
        title: 'فاتورة متأخرة',
        message: `فاتورة ${inv.invoice_number} متأخرة منذ ${Math.floor((new Date().getTime() - new Date(inv.due_date).getTime()) / (1000 * 60 * 60 * 24))} أيام`,
        supplier_id: inv.supplier_id,
        invoice_id: inv.id,
        action_url: `/invoices/${inv.id}`
      }));

      await notificationService.createBulk(notifications);
    }
  },

  async createLowStockAlerts() {
    const { data: lowStockProducts } = await supabase
      .from('products')
      .select('id, name_ar, sku, current_stock, min_stock_level');

    if (lowStockProducts) {
      const products = lowStockProducts.filter(p => p.current_stock <= p.min_stock_level);
      if (products.length > 0) {
        const notifications = products.slice(0, 10).map(prod => ({
          type: 'low_stock' as NotificationType,
          title: 'تنبيه مخزون منخفض',
          message: `المنتج ${prod.name_ar} وصل للحد الأدنى`,
          action_url: `/inventory?product=${prod.id}`
        }));

        await notificationService.createBulk(notifications);
      }
    }
  }
};