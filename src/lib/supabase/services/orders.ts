import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export interface OrderItem {
  productId: string;
  name: string;
  nameAr: string;
  price: number;
  quantity: number;
  barcode: string;
  image?: string;
  unit: string;
  taxRate: number;
  itemDiscount: number;
  total: number;
}

export interface POSOrder {
  id: string;
  order_number: string;
  items: OrderItem[];
  subtotal: number;
  order_discount: number;
  tax_total: number;
  total: number;
  paid_amount: number;
  change_amount: number;
  payment_method: string;
  customer_id?: string;
  customer_name: string;
  customer_phone: string;
  notes: string;
  status: string;
  created_at: string;
  paymentDetails?: any;
}

export const orderService = {
  async create(order: {
    order_number: string;
    items: OrderItem[];
    subtotal: number;
    tax_total: number;
    discount: number;
    total: number;
    paid_amount: number;
    change_amount: number;
    payment_method: string;
    customer_id?: string | null;
    customer_name: string;
    customer_phone: string;
    notes?: string;
    status?: string;
    payment_status?: string;
    user_id?: string;
  }) {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        order_number: order.order_number,
        items: order.items,
        subtotal: order.subtotal,
        tax_total: order.tax_total,
        discount: order.discount,
        total: order.total,
        paid_amount: order.paid_amount,
        change_amount: order.change_amount,
        payment_method: order.payment_method,
        customer_id: order.customer_id || null,
        customer_name: order.customer_name || 'ضيف',
        customer_phone: order.customer_phone || '',
        notes: order.notes || '',
        status: order.status || 'completed',
        payment_status: order.payment_status || 'paid',
        user_id: order.user_id || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Order save error:', error);
      throw error;
    }

    return data;
  },

  async getAll(limit: number = 50) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(normalizeOrder);
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return normalizeOrder(data);
  },

  async getByStatus(status: string) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(normalizeOrder);
  },

  async generateOrderNumber() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const time = date.getTime().toString().slice(-6);
    return `POS-${year}${month}${day}-${time}`;
  },

  subscribeToOrders(callback: (order: POSOrder) => void) {
    return supabase
      .channel('orders')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'orders'
      }, (payload) => {
        callback(normalizeOrder(payload.new));
      })
      .subscribe();
  },

  async updateStatus(orderId: string, status: string, changedBy?: string, notes?: string) {
    const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
    if (!order) throw new Error('Order not found');

    const { error: orderError } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId);
    if (orderError) throw orderError;

    await supabase.from('order_status_log').insert({
      order_id: orderId,
      from_status: order.status,
      to_status: status,
      changed_by: changedBy,
      notes,
    });

    const { data } = await supabase.from('orders').select('*').eq('id', orderId).single();
    return normalizeOrder(data);
  },

  async createWithDelivery(orderData: any, deliveryData: {
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    deliveryFee: number;
    estimatedMinutes: number;
    customerId?: string;
  }) {
    const order = await this.create(orderData);

    await supabase.from('deliveries').insert({
      order_id: order.id,
      customer_id: deliveryData.customerId || null,
      customer_name: deliveryData.customerName,
      customer_phone: deliveryData.customerPhone,
      customer_address: deliveryData.customerAddress,
      store_lat: 30.0444,
      store_lng: 31.2357,
      delivery_fee: deliveryData.deliveryFee,
      estimated_minutes: deliveryData.estimatedMinutes,
      status: 'pending',
    });

    await supabase.from('order_status_log').insert({
      order_id: order.id,
      from_status: null,
      to_status: 'pending_delivery',
      notes: 'تم إنشاء طلب مع توصيل',
    });

    return order;
  },
};

function normalizeOrder(raw: any): POSOrder {
  const items = Array.isArray(raw.items) ? raw.items : [];

  return {
    id: raw.id || '',
    order_number: raw.order_number || raw.id?.substring(0, 8) || '',
    items,
    subtotal: raw.subtotal || 0,
    order_discount: raw.discount || 0,
    tax_total: raw.tax_total || 0,
    total: raw.total || 0,
    paid_amount: raw.paid_amount || raw.total || 0,
    change_amount: raw.change_amount || 0,
    payment_method: raw.payment_method || 'cash',
    customer_name: raw.customer_name || '',
    customer_phone: raw.customer_phone || '',
    notes: raw.notes || '',
    status: raw.status || 'completed',
    created_at: raw.created_at || new Date().toISOString(),
  };
}
