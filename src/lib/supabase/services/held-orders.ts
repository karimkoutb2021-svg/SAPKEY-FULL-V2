import { createClient } from '@/lib/supabase/client';

export interface HeldOrder {
  id: string;
  cashier_id: string;
  customer_name: string;
  items: any[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes: string;
  created_at: string;
}

const supabase = createClient();
const LOCAL_KEY = 'pos_held_orders_fallback';

function getLocalOrders(): HeldOrder[] {
  try {
    const data = localStorage.getItem(LOCAL_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalOrders(orders: HeldOrder[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(orders));
}

export const heldOrderService = {
  async getAll(cashierId: string): Promise<HeldOrder[]> {
    try {
      const { data, error } = await supabase
        .from('held_orders')
        .select('id, cashier_id, customer_name, items, subtotal, tax, discount, total, notes, created_at')
        .eq('cashier_id', cashierId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as HeldOrder[];
    } catch (e) {
      console.warn('Supabase held_orders failed, using localStorage:', e);
      return getLocalOrders().filter(o => o.cashier_id === cashierId);
    }
  },

  async create(order: Omit<HeldOrder, 'id' | 'created_at'>): Promise<HeldOrder> {
    const newOrder: HeldOrder = {
      ...order,
      id: `held-${Date.now()}`,
      created_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from('held_orders')
        .insert({
          cashier_id: order.cashier_id,
          customer_name: order.customer_name,
          items: order.items,
          subtotal: order.subtotal,
          tax: order.tax,
          discount: order.discount,
          total: order.total,
          notes: order.notes,
        })
        .select()
        .single();
      if (error) throw error;
      return data as HeldOrder;
    } catch (e) {
      console.warn('Supabase held_orders failed, using localStorage:', e);
      const local = getLocalOrders();
      local.unshift(newOrder);
      saveLocalOrders(local);
      return newOrder;
    }
  },

  async delete(orderId: string, cashierId: string): Promise<void> {
    try {
      await supabase.from('held_orders').delete().eq('id', orderId).eq('cashier_id', cashierId);
    } catch (e) {
      console.warn('Supabase held_orders delete failed, using localStorage:', e);
      const local = getLocalOrders().filter(o => o.id !== orderId);
      saveLocalOrders(local);
    }
  },

  async resume(orderId: string, cashierId: string): Promise<HeldOrder | null> {
    try {
      const { data, error } = await supabase
        .from('held_orders')
        .select('*')
        .eq('id', orderId)
        .eq('cashier_id', cashierId)
        .single();
      if (error) throw error;
      await supabase.from('held_orders').delete().eq('id', orderId).eq('cashier_id', cashierId);
      return data as HeldOrder;
    } catch (e) {
      console.warn('Supabase held_orders resume failed, using localStorage:', e);
      const local = getLocalOrders();
      const order = local.find(o => o.id === orderId && o.cashier_id === cashierId);
      if (order) {
        saveLocalOrders(local.filter(o => o.id !== orderId));
        return order;
      }
      return null;
    }
  },
};
