import { createClient } from '@/lib/supabase/client';

export interface Refund {
  id: string;
  order_id: string;
  transaction_id?: string;
  cashier_id: string;
  approved_by?: string;
  refund_number: string;
  reason: string;
  items: any[];
  total: number;
  refund_method: 'cash' | 'card' | 'wallet';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

const supabase = createClient();

export const refundService = {
  async generateRefundNumber() {
    const { count } = await supabase.from('refunds').select('*', { count: 'exact', head: true });
    const num = (count || 0) + 1;
    return `REF-${new Date().getFullYear()}-${String(num).padStart(5, '0')}`;
  },

  async createRefund(orderId: string, cashierId: string, items: any[], total: number, reason: string, refundMethod: 'cash' | 'card' | 'wallet' = 'cash') {
    const refundNumber = await this.generateRefundNumber();

    const { data, error } = await supabase
      .from('refunds')
      .insert({
        order_id: orderId,
        cashier_id: cashierId,
        refund_number: refundNumber,
        reason,
        items,
        total,
        refund_method: refundMethod,
        status: 'pending',
      })
      .select()
      .single();
    if (error) throw error;
    return data as Refund;
  },

  async approveRefund(refundId: string, approvedBy: string) {
    const { data, error } = await supabase
      .from('refunds')
      .update({ status: 'approved', approved_by: approvedBy, approved_at: new Date().toISOString() })
      .eq('id', refundId)
      .select()
      .single();
    if (error) throw error;
    return data as Refund;
  },

  async rejectRefund(refundId: string, approvedBy: string) {
    const { data, error } = await supabase
      .from('refunds')
      .update({ status: 'rejected', approved_by: approvedBy, approved_at: new Date().toISOString() })
      .eq('id', refundId)
      .select()
      .single();
    if (error) throw error;
    return data as Refund;
  },

  async completeRefund(refundId: string) {
    const { data, error } = await supabase
      .from('refunds')
      .update({ status: 'completed' })
      .eq('id', refundId)
      .select()
      .single();
    if (error) throw error;
    return data as Refund;
  },

  async getById(id: string) {
    const { data, error } = await supabase.from('refunds').select('*').eq('id', id).single();
    if (error) throw error;
    return data as Refund;
  },

  async getByOrderId(orderId: string) {
    const { data, error } = await supabase.from('refunds').select('*').eq('order_id', orderId);
    if (error) throw error;
    return data as Refund[];
  },

  async getAll(cashierId?: string, status?: string, limit = 50) {
    let query = supabase.from('refunds').select('*', { count: 'exact' }).limit(limit);
    if (cashierId) query = query.eq('cashier_id', cashierId);
    if (status) query = query.eq('status', status);
    const { data, error, count } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return { data: data as Refund[], count };
  },

  async getPendingRefunds() {
    const { data, error } = await supabase
      .from('refunds')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Refund[];
  },
};
