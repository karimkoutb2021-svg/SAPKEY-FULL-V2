import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export interface Leave {
  id: string;
  employee_id: string;
  employee_name?: string;
  type: 'permission' | 'vacation' | 'sick';
  reason: string;
  from_date: string;
  to_date: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  created_at: string;
}

export const leaveService = {
  async getAll(params?: { status?: string; employee_id?: string }) {
    let query = supabase.from('leaves').select('*').order('created_at', { ascending: false });
    if (params?.status) query = query.eq('status', params.status);
    if (params?.employee_id) query = query.eq('employee_id', params.employee_id);
    return query;
  },

  async create(data: {
    employee_id: string;
    employee_name: string;
    type: Leave['type'];
    reason: string;
    from_date: string;
    to_date: string;
  }) {
    return supabase.from('leaves').insert({ ...data, status: 'pending' }).select().single();
  },

  async updateStatus(id: string, status: Leave['status'], approvedBy?: string) {
    const updates: any = { status };
    if (approvedBy) updates.approved_by = approvedBy;
    return supabase.from('leaves').update(updates).eq('id', id).select().single();
  },
};
