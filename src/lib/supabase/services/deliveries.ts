import { createClient } from '@/lib/supabase/client';

export interface Delivery {
  id: string;
  order_id: string;
  driver_id?: string;
  customer_id?: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_lat?: number;
  customer_lng?: number;
  store_lat: number;
  store_lng: number;
  status: 'pending' | 'assigned' | 'picked' | 'in_transit' | 'delivered' | 'failed';
  estimated_minutes: number;
  actual_minutes?: number;
  delivery_fee: number;
  notes?: string;
  dispatched_at?: string;
  picked_at?: string;
  delivered_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DeliveryProof {
  id: string;
  delivery_id: string;
  photo_url?: string;
  signature_url?: string;
  notes?: string;
  created_at: string;
}

const supabase = createClient();

export const deliveryService = {
  async createDelivery(orderId: string, customerName: string, customerPhone: string, customerAddress: string, deliveryFee: number, estimatedMinutes = 30, customerId?: string) {
    const { data, error } = await supabase
      .from('deliveries')
      .insert({
        order_id: orderId,
        customer_id: customerId,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        store_lat: 30.0444,
        store_lng: 31.2357,
        delivery_fee: deliveryFee,
        estimated_minutes: estimatedMinutes,
        status: 'pending',
      })
      .select()
      .single();
    if (error) throw error;
    return data as Delivery;
  },

  async assignDriver(deliveryId: string, driverId: string) {
    const { data, error } = await supabase
      .from('deliveries')
      .update({ driver_id: driverId, status: 'assigned', dispatched_at: new Date().toISOString() })
      .eq('id', deliveryId)
      .select()
      .single();
    if (error) throw error;
    return data as Delivery;
  },

  async updateStatus(deliveryId: string, status: Delivery['status']) {
    const updates: any = { status, updated_at: new Date().toISOString() };

    if (status === 'picked') updates.picked_at = new Date().toISOString();
    if (status === 'in_transit') updates.dispatched_at = new Date().toISOString();
    if (status === 'delivered') {
      updates.delivered_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('deliveries')
      .update(updates)
      .eq('id', deliveryId)
      .select()
      .single();
    if (error) throw error;
    return data as Delivery;
  },

  async getById(id: string) {
    const { data, error } = await supabase.from('deliveries').select('*').eq('id', id).single();
    if (error) throw error;
    return data as Delivery;
  },

  async getByOrderId(orderId: string) {
    const { data, error } = await supabase.from('deliveries').select('*').eq('order_id', orderId).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data as Delivery | null;
  },

  async getByDriver(driverId: string, status?: string) {
    let query = supabase.from('deliveries').select('id, order_id, driver_id, customer_name, customer_phone, customer_address, status, estimated_minutes, actual_minutes, delivery_fee, dispatched_at, picked_at, delivered_at, created_at').eq('driver_id', driverId);
    if (status) query = query.eq('status', status);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data as Delivery[];
  },

  async getAll(status?: string, limit = 50) {
    let query = supabase.from('deliveries').select('id, order_id, driver_id, customer_name, customer_phone, customer_address, status, estimated_minutes, actual_minutes, delivery_fee, dispatched_at, picked_at, delivered_at, created_at', { count: 'exact' }).limit(limit);
    if (status) query = query.eq('status', status);
    const { data, error, count } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return { data: data as Delivery[], count };
  },

  async getPendingDeliveries() {
    const { data, error } = await supabase
      .from('deliveries')
      .select('id, order_id, driver_id, customer_name, customer_phone, customer_address, status, estimated_minutes, delivery_fee, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data as Delivery[];
  },

  async addProof(deliveryId: string, photoUrl?: string, signatureUrl?: string, notes?: string) {
    const { data, error } = await supabase
      .from('delivery_proofs')
      .insert({ delivery_id: deliveryId, photo_url: photoUrl, signature_url: signatureUrl, notes })
      .select()
      .single();
    if (error) throw error;
    return data as DeliveryProof;
  },

  async subscribeToDelivery(deliveryId: string, callback: (delivery: Delivery) => void) {
    const channel = supabase
      .channel(`delivery-${deliveryId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'deliveries', filter: `id=eq.${deliveryId}` },
        (payload) => callback(payload.new as Delivery)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  async subscribeToAllDeliveries(callback: (deliveries: Delivery[]) => void) {
    const channel = supabase
      .channel('all-deliveries')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deliveries' },
        () => {
          this.getAll().then(({ data }) => callback(data));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
