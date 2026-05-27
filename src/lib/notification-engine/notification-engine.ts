import { createClient } from '@/lib/supabase/client';
import { notificationService } from '@/lib/supabase/services/notifications';
import type { NotificationType, ERPNotification, ProductNotificationThreshold, CashThresholdConfig } from '@/types/erp';

export interface RuleSetting {
  id?: string;
  type: NotificationType;
  enabled: boolean;
  delegable: boolean;
  delegated_to: string | null;
  requires_biometric: boolean;
  threshold_value: number | null;
  advance_days: number | null;
}

const supabase = createClient();

export const notificationEngine = {
  async runAllChecks() {
    await Promise.all([
      this.checkLowStock(),
      this.checkExpiryAlerts(),
      this.checkCashThresholds(),
    ]);
  },

  async checkLowStock() {
    const { data: thresholds } = await supabase
      .from('product_notification_thresholds')
      .select('*, products!inner(id, name_ar, sku), warehouses!inner(id, name_ar)');

    if (!thresholds) return;

    const notifications: Array<{
      type: NotificationType;
      title: string;
      message: string;
      product_id: string;
      action_url: string;
      metadata: any;
    }> = [];

    for (const t of thresholds as any[]) {
      const productId = t.product_id;
      const warehouseId = t.warehouse_id;
      const customMin = t.custom_min_stock;

      let stockQuery = supabase
        .from('product_stock')
        .select('quantity')
        .eq('product_id', productId);

      if (warehouseId) {
        stockQuery = stockQuery.eq('warehouse_id', warehouseId);
      }

      const { data: stock } = await stockQuery.single();
      if (stock && stock.quantity <= customMin) {
        const productName = t.products?.name_ar || 'منتج';
        const warehouseName = warehouseId ? (t.warehouses?.name_ar || '') : 'الكل';
        notifications.push({
          type: 'low_stock',
          title: 'تنبيه مخزون منخفض',
          message: `المنتج "${productName}" وصل ${stock.quantity} في "${warehouseName}" (الحد: ${customMin})`,
          product_id: productId,
          action_url: `/manager/inventory?product=${productId}`,
          metadata: { warehouse_id: warehouseId, current_stock: stock.quantity, threshold: customMin },
        });
      }
    }

    if (notifications.length > 0) {
      await notificationService.createBulk(notifications as any);
    }
  },

  async checkExpiryAlerts() {
    const now = new Date();
    const { data: batches } = await supabase
      .from('product_batches')
      .select('id, product_id, batch_number, expiry_date, quantity, products!inner(name_ar, sku)')
      .not('expiry_date', 'is', null)
      .gt('quantity', 0);

    if (!batches) return;

    const { data: thresholds } = await supabase
      .from('product_notification_thresholds')
      .select('product_id, expiry_alert_days');

    const thresholdMap = new Map<string, number>();
    if (thresholds) {
      for (const t of thresholds) {
        thresholdMap.set(t.product_id, t.expiry_alert_days || 30);
      }
    }

    const notifications: Array<{
      type: NotificationType;
      title: string;
      message: string;
      product_id: string;
      action_url: string;
      metadata: any;
    }> = [];

    for (const batch of batches as any[]) {
      const expiryDate = new Date(batch.expiry_date);
      const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry < 0) continue;

      const alertDays = thresholdMap.get(batch.product_id) || 30;
      if (daysUntilExpiry <= alertDays) {
        const productName = batch.products?.name_ar || 'منتج';
        notifications.push({
          type: 'expiry_alert',
          title: `تنبيه صلاحية - ${productName}`,
          message: `المنتج "${productName}" (batch: ${batch.batch_number}) ينتهي خلال ${daysUntilExpiry} يوماً`,
          product_id: batch.product_id,
          action_url: `/manager/inventory?batch=${batch.id}`,
          metadata: { batch_id: batch.id, days_until_expiry: daysUntilExpiry, batch_number: batch.batch_number, quantity: batch.quantity },
        });
      }
    }

    if (notifications.length > 0) {
      await notificationService.createBulk(notifications as any);
    }
  },

  async checkCashThresholds() {
    const { data: configs } = await supabase
      .from('cash_threshold_configs')
      .select('*')
      .eq('enabled', true);

    if (!configs) return;

    const { data: shifts } = await supabase
      .from('shifts')
      .select('id, branch_id, cash_total')
      .eq('status', 'active');

    if (!shifts) return;

    const notifications: Array<{
      type: NotificationType;
      title: string;
      message: string;
      shift_id: string;
      action_url: string;
      metadata: any;
    }> = [];

    for (const config of configs as CashThresholdConfig[]) {
      const matchingShifts = config.branch_id
        ? shifts.filter(s => s.branch_id === config.branch_id)
        : shifts;

      for (const shift of matchingShifts) {
        if (shift.cash_total >= config.safe_limit) {
          notifications.push({
            type: 'cash_threshold',
            title: 'تنبيه حد الكاش - تجاوز السقف الآمن',
            message: `الكاش في وردية ${shift.id} تجاوز ${config.safe_limit} ج.م (الرصيد: ${shift.cash_total} ج.م)`,
            shift_id: shift.id,
            action_url: `/manager/pos-monitoring?shift=${shift.id}`,
            metadata: { branch_id: config.branch_id, shift_id: shift.id, cash_total: shift.cash_total, safe_limit: config.safe_limit },
          });
        }
      }
    }

    if (notifications.length > 0) {
      await notificationService.createBulk(notifications as any);
    }
  },

  async createReturnRequestNotification(data: {
    returnId: string;
    invoiceId: string;
    cashierName: string;
    customerName: string;
    itemsCount: number;
    total: number;
    reason: string;
  }) {
    return await notificationService.create({
      type: 'return_request',
      title: 'طلب إرجاع منتجات - يحتاج موافقة',
      message: `الكاشير ${data.cashierName} يطلب إرجاع ${data.itemsCount} صنف بقيمة ${data.total} ج.م للعميل ${data.customerName} - السبب: ${data.reason}`,
      action_url: `/pos/returns?return=${data.returnId}`,
      requires_approval: true,
      metadata: {
        return_id: data.returnId,
        invoice_id: data.invoiceId,
        cashier_name: data.cashierName,
        customer_name: data.customerName,
        total: data.total,
        reason: data.reason,
      },
    });
  },

  async createInvoiceModifiedNotification(data: {
    invoiceId: string;
    invoiceNumber: string;
    cashierName: string;
    action: 'cancelled' | 'modified';
    reason: string;
    oldTotal?: number;
    newTotal?: number;
  }) {
    const type: NotificationType = data.action === 'cancelled' ? 'invoice_cancelled' : 'invoice_modified';
    const title = data.action === 'cancelled' ? 'فاتورة ملغاة' : 'فاتورة معدلة';
    const message = data.action === 'cancelled'
      ? `الكاشير ${data.cashierName} ألغى الفاتورة ${data.invoiceNumber} - السبب: ${data.reason}`
      : `الكاشير ${data.cashierName} عدّل الفاتورة ${data.invoiceNumber} (من ${data.oldTotal} إلى ${data.newTotal} ج.م) - السبب: ${data.reason}`;

    return await notificationService.create({
      type,
      title,
      message,
      invoice_id: data.invoiceId,
      action_url: `/manager/orders?invoice=${data.invoiceId}`,
      requires_approval: false,
      metadata: {
        invoice_number: data.invoiceNumber,
        cashier_name: data.cashierName,
        reason: data.reason,
        old_total: data.oldTotal,
        new_total: data.newTotal,
        action: data.action,
      },
    });
  },

  async runDailyScheduledChecks() {
    await this.checkExpiryAlerts();
    await this.checkLowStock();
  },
};

export const notificationRuleService = {
  async getAll() {
    const { data, error } = await supabase
      .from('notification_rules')
      .select('*')
      .order('type');
    if (error) throw error;
    return data as any[];
  },

  async update(id: string, updates: {
    enabled?: boolean;
    delegated_to?: string | null;
    requires_biometric?: boolean;
    threshold_value?: number | null;
    advance_days?: number | null;
  }) {
    const { data, error } = await supabase
      .from('notification_rules')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getDefaults(): Promise<RuleSetting[]> {
    return [
      { id: undefined, type: 'low_stock' as NotificationType, enabled: true, delegable: false, delegated_to: null, requires_biometric: false, threshold_value: null, advance_days: null },
      { id: undefined, type: 'expiry_alert' as NotificationType, enabled: true, delegable: false, delegated_to: null, requires_biometric: false, threshold_value: null, advance_days: 30 },
      { id: undefined, type: 'return_request' as NotificationType, enabled: true, delegable: true, delegated_to: null, requires_biometric: false, threshold_value: null, advance_days: null },
      { id: undefined, type: 'invoice_cancelled' as NotificationType, enabled: true, delegable: true, delegated_to: null, requires_biometric: false, threshold_value: null, advance_days: null },
      { id: undefined, type: 'invoice_modified' as NotificationType, enabled: true, delegable: true, delegated_to: null, requires_biometric: false, threshold_value: null, advance_days: null },
      { id: undefined, type: 'cash_threshold' as NotificationType, enabled: true, delegable: false, delegated_to: null, requires_biometric: true, threshold_value: 50000, advance_days: null },
      { id: undefined, type: 'due_date' as NotificationType, enabled: true, delegable: false, delegated_to: null, requires_biometric: false, threshold_value: null, advance_days: null },
      { id: undefined, type: 'overdue' as NotificationType, enabled: true, delegable: false, delegated_to: null, requires_biometric: false, threshold_value: null, advance_days: null },
      { id: undefined, type: 'approval' as NotificationType, enabled: true, delegable: false, delegated_to: null, requires_biometric: true, threshold_value: null, advance_days: null },
      { id: undefined, type: 'payment_reminder' as NotificationType, enabled: true, delegable: false, delegated_to: null, requires_biometric: false, threshold_value: null, advance_days: null },
      { id: undefined, type: 'balance_alert' as NotificationType, enabled: true, delegable: false, delegated_to: null, requires_biometric: true, threshold_value: null, advance_days: null },
      { id: undefined, type: 'transfer_alert' as NotificationType, enabled: true, delegable: false, delegated_to: null, requires_biometric: false, threshold_value: null, advance_days: null },
      { id: undefined, type: 'system_alert' as NotificationType, enabled: true, delegable: false, delegated_to: null, requires_biometric: false, threshold_value: null, advance_days: null },
    ];
  },
};

export const productThresholdService = {
  async getByProduct(productId: string) {
    const { data, error } = await supabase
      .from('product_notification_thresholds')
      .select('*')
      .eq('product_id', productId)
      .maybeSingle();
    if (error) throw error;
    return data as ProductNotificationThreshold | null;
  },

  async upsert(threshold: {
    product_id: string;
    warehouse_id?: string;
    custom_min_stock: number;
    expiry_alert_days?: number;
  }) {
    const { data, error } = await supabase
      .from('product_notification_thresholds')
      .upsert(threshold, { onConflict: 'product_id,warehouse_id' })
      .select()
      .single();
    if (error) throw error;
    return data as ProductNotificationThreshold;
  },

  async getAll() {
    const { data, error } = await supabase
      .from('product_notification_thresholds')
      .select('*, products(name_ar, sku), warehouses(name_ar)');
    if (error) throw error;
    return data as any[];
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('product_notification_thresholds')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },
};

export const cashThresholdService = {
  async getAll() {
    const { data, error } = await supabase
      .from('cash_threshold_configs')
      .select('*');
    if (error) throw error;
    return data as CashThresholdConfig[];
  },

  async upsert(config: {
    branch_id?: string;
    safe_limit: number;
    enabled: boolean;
    notify_manager: boolean;
  }) {
    const { data, error } = await supabase
      .from('cash_threshold_configs')
      .upsert(config, { onConflict: 'branch_id' })
      .select()
      .single();
    if (error) throw error;
    return data as CashThresholdConfig;
  },

  async update(id: string, updates: Partial<CashThresholdConfig>) {
    const { data, error } = await supabase
      .from('cash_threshold_configs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as CashThresholdConfig;
  },
};

export const notificationApprovalService = {
  async approveReturnReturn(notificationId: string, approved: boolean, approvedBy: string) {
    const { data, error } = await supabase
      .from('notifications')
      .update({
        approved,
        approved_at: new Date().toISOString(),
        approved_by: approvedBy,
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .select()
      .single();
    if (error) throw error;
    return data as ERPNotification;
  },

  async subscribeToApprovals(callback: (notification: ERPNotification) => void) {
    return supabase
      .channel('notification-approvals')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: 'requires_approval=eq.true',
      }, (payload) => {
        callback(payload.new as ERPNotification);
      })
      .subscribe();
  },
};
