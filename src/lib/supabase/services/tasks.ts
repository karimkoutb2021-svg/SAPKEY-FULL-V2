import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export interface Task {
  id: string;
  assigned_to: string;
  assigned_to_name?: string;
  assigned_by?: string;
  title: string;
  description?: string;
  priority: 'urgent' | 'normal' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  due_date?: string;
  completed_at?: string;
  created_at: string;
}

export const taskService = {
  async getAll(params?: { status?: string; assigned_to?: string }) {
    let query = supabase.from('tasks').select('id, title, description, status, priority, assigned_to, due_date, created_at').order('created_at', { ascending: false });
    if (params?.status) query = query.eq('status', params.status);
    if (params?.assigned_to) query = query.eq('assigned_to', params.assigned_to);
    return query;
  },

  async getById(id: string) {
    return supabase.from('tasks').select('id, title, description, status, priority, assigned_to, due_date, created_at').eq('id', id).single();
  },

  async create(data: {
    assigned_to: string;
    assigned_to_name: string;
  assigned_by?: string;
    title: string;
    description?: string;
    priority?: Task['priority'];
    due_date?: string;
  }) {
    return supabase.from('tasks').insert({ ...data, status: 'pending' }).select().single();
  },

  async updateStatus(id: string, status: Task['status']) {
    const updates: any = { status };
    if (status === 'completed') updates.completed_at = new Date().toISOString();
    return supabase.from('tasks').update(updates).eq('id', id).select().single();
  },

  async update(id: string, data: Partial<Task>) {
    return supabase.from('tasks').update(data).eq('id', id).select().single();
  },
};
