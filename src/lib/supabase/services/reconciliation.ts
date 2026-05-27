import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export interface ReconciliationSession {
  id: string;
  session_date: string;
  status: 'open' | 'in_progress' | 'completed';
  total_system_balance: number;
  total_actual_balance: number;
  total_difference: number;
  pending_operations_count: number;
  pending_transfers_count: number;
  pending_collections_count: number;
  started_by?: string;
  started_at: string;
  completed_by?: string;
  completed_at?: string;
  notes?: string;
  created_at: string;
}

export interface DiscrepancyEntry {
  id: string;
  session_id: string;
  type: 'treasury' | 'inventory' | 'transfer' | 'collection';
  source_type: string;
  source_id: string;
  source_name: string;
  system_value: number;
  actual_value: number;
  difference: number;
  reason?: string;
  resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  resolution_notes?: string;
  created_at: string;
}

export interface ReconciliationLog {
  id: string;
  session_id: string;
  action: 'started' | 'discrepancy_found' | 'discrepancy_resolved' | 'settlement_recorded' | 'completed' | 'cancelled';
  description: string;
  performed_by?: string;
  performed_by_name?: string;
  created_at: string;
}

export const STATUS_CONFIG = {
  open: { label: 'مفتوحة', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  in_progress: { label: 'قيد المطابقة', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  completed: { label: 'مكتملة', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
};

export const DISCREPANCY_TYPES = {
  treasury: 'خزينة',
  inventory: 'مخزون',
  transfer: 'تحويل',
  collection: 'تحصيل',
};

export const reconciliationService = {
  async getAll(status?: ReconciliationSession['status']) {
    let query = supabase.from('reconciliation_sessions').select('*').order('session_date', { ascending: false });
    if (status) query = query.eq('status', status);
    return query;
  },

  async getById(id: string) {
    return supabase.from('reconciliation_sessions').select('*').eq('id', id).single();
  },

  async getTodaySession() {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('reconciliation_sessions')
      .select('*')
      .eq('session_date', today)
      .single();

    if (data) return { data, error: null };
    if (error && error.code !== 'PGRST116') return { data, error };

    const now = new Date().toISOString();
    return supabase.from('reconciliation_sessions').insert({
      session_date: today,
      status: 'open',
      total_system_balance: 0,
      total_actual_balance: 0,
      total_difference: 0,
      pending_operations_count: 0,
      pending_transfers_count: 0,
      pending_collections_count: 0,
      started_at: now,
    }).select().single();
  },

  async create(data: Partial<ReconciliationSession>) {
    return supabase.from('reconciliation_sessions').insert(data).select().single();
  },

  async update(id: string, data: Partial<ReconciliationSession>) {
    return supabase.from('reconciliation_sessions').update(data).eq('id', id).select().single();
  },

  async complete(id: string, completedBy: string) {
    return supabase.from('reconciliation_sessions').update({
      status: 'completed',
      completed_by: completedBy,
      completed_at: new Date().toISOString(),
    }).eq('id', id).select().single();
  },

  async getDashboardData() {
    const today = new Date().toISOString().split('T')[0];
    const { data: todaySession } = await supabase
      .from('reconciliation_sessions')
      .select('*')
      .eq('session_date', today)
      .maybeSingle();

    const { count: pendingCount } = await supabase
      .from('reconciliation_sessions')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'completed');

    const { data: discrepancies } = await supabase
      .from('discrepancy_entries')
      .select('difference')
      .eq('resolved', false);

    const totalDifference = discrepancies?.reduce((sum, d) => sum + (d.difference || 0), 0) ?? 0;

    return {
      todaySession,
      pendingCount: pendingCount ?? 0,
      discrepancyCount: discrepancies?.length ?? 0,
      totalDifference,
    };
  },
};

export const discrepancyService = {
  async getAll(sessionId: string) {
    return supabase.from('discrepancy_entries').select('*').eq('session_id', sessionId).order('created_at', { ascending: false });
  },

  async create(data: Partial<DiscrepancyEntry>) {
    return supabase.from('discrepancy_entries').insert(data).select().single();
  },

  async resolve(id: string, resolvedBy: string, notes: string) {
    return supabase.from('discrepancy_entries').update({
      resolved: true,
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString(),
      resolution_notes: notes,
    }).eq('id', id).select().single();
  },

  async getUnresolved(sessionId: string) {
    return supabase.from('discrepancy_entries').select('*').eq('session_id', sessionId).eq('resolved', false).order('created_at', { ascending: false });
  },
};

export const reconciliationLogService = {
  async getAll(sessionId: string) {
    return supabase.from('reconciliation_logs').select('*').eq('session_id', sessionId).order('created_at', { ascending: false });
  },

  async create(data: Partial<ReconciliationLog>) {
    return supabase.from('reconciliation_logs').insert(data).select().single();
  },
};
