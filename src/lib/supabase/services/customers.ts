import { createClient } from '@/lib/supabase/client';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  points: number;
  total_spent: number;
  total_orders: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const supabase = createClient();

export const customerService = {
  async getAll(params?: { is_active?: boolean; limit?: number }) {
    let query = supabase.from('customers').select('id, name, phone, email, points, total_spent, total_orders, is_active, created_at', { count: 'exact' });
    if (params?.is_active !== undefined) query = query.eq('is_active', params.is_active);
    if (params?.limit) query = query.limit(params.limit);
    const { data, error, count } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return { data: data as Customer[], count };
  },

  async getById(id: string) {
    const { data, error } = await supabase.from('customers').select('*').eq('id', id).single();
    if (error) throw error;
    return data as Customer;
  },

  async search(query: string) {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, phone, email, points, total_spent, total_orders, is_active, created_at')
      .or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(20);
    if (error) throw error;
    return data as Customer[];
  },

  async create(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase.from('customers').insert(customer).select().single();
    if (error) throw error;
    return data as Customer;
  },

  async update(id: string, customer: Partial<Customer>) {
    const { data, error } = await supabase.from('customers').update(customer).eq('id', id).select().single();
    if (error) throw error;
    return data as Customer;
  },

  async incrementPoints(id: string, points: number) {
    const { data, error } = await supabase
      .from('customers')
      .update({ points: supabase.rpc('increment', { val: points }) })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Customer;
  },
};
