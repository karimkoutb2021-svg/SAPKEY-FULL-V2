import { createClient } from '@/lib/supabase/client';

export interface Shift {
  id: string;
  cashier_id: string;
  branch_id?: string;
  opened_at: string;
  closed_at?: string;
  starting_cash: number;
  expected_cash: number;
  actual_cash: number;
  expected_card: number;
  actual_card: number;
  expected_network: number;
  actual_network: number;
  cash_shortage: number;
  previous_shift_closing_cash: number;
  discrepancy_amount: number;
  discrepancy_reason?: string;
  discrepancy_approved_by?: string;
  discrepancy_approved_at?: string;
  notes?: string;
  status: 'open' | 'closed' | 'pending_approval';
  created_at: string;
  updated_at: string;
}

const supabase = createClient();
const LOCAL_KEY = 'pos_shifts_fallback';

function getLocalShifts(): Shift[] {
  try {
    const data = localStorage.getItem(LOCAL_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveLocalShifts(shifts: Shift[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(shifts));
}

export const shiftService = {
  async getLastClosedShift(): Promise<Shift | null> {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('id, cashier_id, branch_id, opened_at, closed_at, starting_cash, expected_cash, actual_cash, expected_card, actual_card, expected_network, actual_network, cash_shortage, previous_shift_closing_cash, discrepancy_amount, discrepancy_reason, discrepancy_approved_by, discrepancy_approved_at, notes, status, created_at, updated_at')
        .eq('status', 'closed')
        .order('closed_at', { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as Shift | null;
    } catch {
      const local = getLocalShifts();
      return local.find(s => s.status === 'closed') || null;
    }
  },

  async openShift(cashierId: string, startingCash: number, branchId?: string): Promise<Shift> {
    const lastShift = await this.getLastClosedShift();
    const previousClosingCash = lastShift?.actual_cash || 0;
    const discrepancy = startingCash - previousClosingCash;

    const newShift: Shift = {
      id: `shift-${Date.now()}`,
      cashier_id: cashierId,
      branch_id: branchId,
      opened_at: new Date().toISOString(),
      starting_cash: startingCash,
      expected_cash: startingCash,
      actual_cash: startingCash,
      expected_card: 0,
      actual_card: 0,
      expected_network: 0,
      actual_network: 0,
      cash_shortage: 0,
      previous_shift_closing_cash: previousClosingCash,
      discrepancy_amount: discrepancy,
      status: discrepancy !== 0 ? 'pending_approval' : 'open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from('shifts')
        .insert({
          cashier_id: cashierId,
          branch_id: branchId,
          starting_cash: startingCash,
          expected_cash: startingCash,
          actual_cash: startingCash,
          previous_shift_closing_cash: previousClosingCash,
          discrepancy_amount: discrepancy,
          status: newShift.status,
        })
        .select('id, cashier_id, branch_id, opened_at, closed_at, starting_cash, expected_cash, actual_cash, expected_card, actual_card, expected_network, actual_network, cash_shortage, previous_shift_closing_cash, discrepancy_amount, status, created_at, updated_at')
        .single();
      if (error) throw error;
      return data as Shift;
    } catch {
      const local = getLocalShifts();
      local.unshift(newShift);
      saveLocalShifts(local);
      return newShift;
    }
  },

  async closeShift(shiftId: string, actualCash: number, actualCard: number, actualNetwork: number, notes?: string): Promise<Shift> {
    const openShift = await this.getOpenShift(shiftId.split('-')[1] || '');
    const cashShortage = actualCash - (openShift?.expected_cash || 0);

    const newShift: Shift = {
      id: shiftId,
      cashier_id: '',
      opened_at: '',
      starting_cash: 0,
      expected_cash: 0,
      actual_cash: actualCash,
      expected_card: 0,
      actual_card: actualCard,
      expected_network: 0,
      actual_network: actualNetwork,
      cash_shortage: cashShortage,
      previous_shift_closing_cash: 0,
      discrepancy_amount: 0,
      status: 'closed',
      closed_at: new Date().toISOString(),
      notes,
      created_at: '',
      updated_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from('shifts')
        .update({
          closed_at: new Date().toISOString(),
          actual_cash: actualCash,
          actual_card: actualCard,
          actual_network: actualNetwork,
          cash_shortage: cashShortage,
          notes,
          status: 'closed',
        })
        .eq('id', shiftId)
        .select()
        .single();
      if (error) throw error;
      return data as Shift;
    } catch {
      const local = getLocalShifts();
      const idx = local.findIndex(s => s.id === shiftId);
      if (idx >= 0) {
        local[idx] = { ...local[idx], ...newShift };
        saveLocalShifts(local);
      }
      return newShift;
    }
  },

  async approveDiscrepancy(shiftId: string, approvedBy: string, reason: string): Promise<Shift> {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .update({ status: 'open', discrepancy_approved_by: approvedBy, discrepancy_approved_at: new Date().toISOString(), discrepancy_reason: reason })
        .eq('id', shiftId)
        .select()
        .single();
      if (error) throw error;
      return data as Shift;
    } catch {
      const local = getLocalShifts();
      const idx = local.findIndex(s => s.id === shiftId);
      if (idx >= 0) {
        local[idx] = { ...local[idx], status: 'open', discrepancy_approved_by: approvedBy, discrepancy_reason: reason };
        saveLocalShifts(local);
      }
      return local[idx];
    }
  },

  async getOpenShift(cashierId: string): Promise<Shift | null> {
    try {
      const { data, error } = await supabase
        .from('shifts')
        .select('id, cashier_id, branch_id, opened_at, closed_at, starting_cash, expected_cash, actual_cash, expected_card, actual_card, expected_network, actual_network, cash_shortage, previous_shift_closing_cash, discrepancy_amount, discrepancy_reason, discrepancy_approved_by, discrepancy_approved_at, notes, status, created_at, updated_at')
        .eq('cashier_id', cashierId)
        .eq('status', 'open')
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as Shift | null;
    } catch {
      const local = getLocalShifts();
      return local.find(s => s.cashier_id === cashierId && s.status === 'open') || null;
    }
  },

  async getShifts(cashierId?: string, limit = 50): Promise<{ data: Shift[]; count: number }> {
    try {
      let query = supabase.from('shifts').select('id, cashier_id, branch_id, opened_at, closed_at, starting_cash, expected_cash, actual_cash, expected_card, actual_card, expected_network, actual_network, cash_shortage, previous_shift_closing_cash, discrepancy_amount, status, created_at, updated_at', { count: 'exact' }).limit(limit);
      if (cashierId) query = query.eq('cashier_id', cashierId);
      const { data, error, count } = await query.order('opened_at', { ascending: false });
      if (error) throw error;
      return { data: data as Shift[], count: count || 0 };
    } catch {
      const local = getLocalShifts();
      const filtered = cashierId ? local.filter(s => s.cashier_id === cashierId) : local;
      return { data: filtered.slice(0, limit), count: filtered.length };
    }
  },

  async getShiftSummary(shiftId: string) {
    const { data: shift } = await supabase.from('shifts').select('id, cashier_id, branch_id, opened_at, closed_at, starting_cash, expected_cash, actual_cash, status, notes, created_at').eq('id', shiftId).single();
    if (!shift) throw new Error('Shift not found');

    const { data: transactions } = await supabase
      .from('pos_transactions')
      .select('total, cash_amount, card_amount, network_amount')
      .eq('shift_id', shiftId)
      .eq('status', 'completed');

    const totalSales = transactions?.reduce((sum, t) => sum + (t.total || 0), 0) || 0;
    const totalCash = transactions?.reduce((sum, t) => sum + (t.cash_amount || 0), 0) || 0;
    const totalCard = transactions?.reduce((sum, t) => sum + (t.card_amount || 0), 0) || 0;
    const totalNetwork = transactions?.reduce((sum, t) => sum + (t.network_amount || 0), 0) || 0;

    return { shift, totalSales, totalCash, totalCard, totalNetwork, transactionCount: transactions?.length || 0, transactions };
  },
};
