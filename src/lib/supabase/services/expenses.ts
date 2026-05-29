import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export interface Expense {
  id: string;
  amount: number;
  description: string;
  category: string;
  responsible: string;
  attachment_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_by?: string;
  created_at: string;
}

export const expenseService = {
  async getAll(params?: { status?: string; category?: string }) {
    let query = supabase.from('expenses').select('id, amount, description, category, responsible, attachment_url, status, created_by, created_at').order('created_at', { ascending: false });
    if (params?.status) query = query.eq('status', params.status);
    if (params?.category) query = query.eq('category', params.category);
    return query;
  },

  async getById(id: string) {
    return supabase.from('expenses').select('id, amount, description, category, responsible, attachment_url, status, created_by, created_at').eq('id', id).single();
  },

  async create(data: {
    amount: number;
    description: string;
    category: string;
    responsible: string;
    attachment_url?: string;
    created_by?: string;
  }) {
    return supabase.from('expenses').insert({ ...data, status: 'pending' }).select().single();
  },

  async updateStatus(id: string, status: Expense['status']) {
    return supabase.from('expenses').update({ status }).eq('id', id).select().single();
  },

  async getCustodianBalance() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from('expenses')
      .select('amount')
      .eq('status', 'approved')
      .gte('created_at', today.toISOString());
    const totalSpent = data?.reduce((s, e) => s + e.amount, 0) || 0;
    const CUSTODIAN_LIMIT = 5000;
    return { limit: CUSTODIAN_LIMIT, spent: totalSpent, remaining: CUSTODIAN_LIMIT - totalSpent };
  },
};
