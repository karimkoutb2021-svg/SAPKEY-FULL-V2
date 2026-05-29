import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export const STATUS_CONFIG = {
  pending: { label: 'معلقة', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: '⏳' },
  processing: { label: 'قيد المعالجة', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: '⚙️' },
  delayed: { label: 'قيد التحصيل', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: '🔄' },
  completed: { label: 'مكتملة', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: '✅' },
  reconciled: { label: 'مطابقة', color: 'bg-green-600/20 text-green-500 border-green-600/30', icon: '🔍' },
  rejected: { label: 'مرفوضة', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: '❌' },
  returned: { label: 'مرتجعة', color: 'bg-violet-500/20 text-violet-400 border-violet-500/30', icon: '⏪' },
};

export interface TreasuryAccount {
  id: string;
  name: string;
  name_ar: string;
  type: 'main' | 'private' | 'branch' | 'wallet';
  wallet_provider?: string;
  opening_balance: number;
  current_balance: number;
  currency?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TreasuryTransaction {
  id: string;
  treasury_id: string;
  type: 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out' | 'opening';
  amount: number;
  description?: string;
  category?: string;
  status: 'pending' | 'processing' | 'delayed' | 'completed' | 'reconciled' | 'rejected' | 'returned';
  reference_id?: string;
  attachment_url?: string;
  performed_by?: string;
  performed_at: string;
  balance_before: number;
  balance_after: number;
  created_at: string;
}

export interface InternalLoan {
  id: string;
  borrower_id: string;
  borrower_name: string;
  borrower_role?: string;
  loan_type?: string;
  amount: number;
  remaining_amount: number;
  reason: string;
  status: 'active' | 'partial' | 'settled';
  issue_date: string;
  expected_settlement_date?: string;
  settled_date?: string;
  created_at?: string;
}

export const treasuryService = {
  async getAll() {
    return supabase.from('treasury_accounts').select('id, name, name_ar, type, opening_balance, current_balance, is_active').eq('is_active', true).order('created_at', { ascending: false });
  },
  async getById(id: string) {
    return supabase.from('treasury_accounts').select('id, name, name_ar, type, opening_balance, current_balance, is_active').eq('id', id).single();
  },
  async create(data: Partial<TreasuryAccount>) {
    return supabase.from('treasury_accounts').insert(data).select().single();
  },
  async update(id: string, data: Partial<TreasuryAccount>) {
    return supabase.from('treasury_accounts').update(data).eq('id', id).select().single();
  },
  async updateBalance(id: string, newBalance: number) {
    return supabase.from('treasury_accounts').update({ current_balance: newBalance, updated_at: new Date().toISOString() }).eq('id', id);
  },
};

export const treasuryTransactionService = {
  async getAll(treasuryId?: string) {
    let query = supabase.from('treasury_transactions').select('*, treasury_accounts(name_ar)').order('created_at', { ascending: false });
    if (treasuryId) query = query.eq('treasury_id', treasuryId);
    return query;
  },
  async create(data: Partial<TreasuryTransaction>) {
    return supabase.from('treasury_transactions').insert(data).select().single();
  },
  async updateStatus(id: string, status: TreasuryTransaction['status']) {
    return supabase.from('treasury_transactions').update({ status }).eq('id', id).select().single();
  },
  async confirmReceipt(id: string) {
    return supabase.from('treasury_transactions').update({ status: 'completed' }).eq('id', id).eq('status', 'delayed').select().single();
  },
  async reconcile(id: string) {
    return supabase.from('treasury_transactions').update({ status: 'reconciled' }).eq('id', id).eq('status', 'completed').select().single();
  },
  async reject(id: string) {
    return supabase.from('treasury_transactions').update({ status: 'rejected' }).eq('id', id).select().single();
  },
};

export const internalLoanService = {
  async getAll(type?: InternalLoan['loan_type']) {
    let query = supabase.from('internal_loans').select('id, borrower_id, borrower_name, amount, remaining_amount, reason, status, issue_date, due_date').order('created_at', { ascending: false });
    if (type) query = query.eq('loan_type', type);
    return query;
  },
  async getByBorrower(borrowerId: string) {
    return supabase.from('internal_loans').select('id, borrower_id, borrower_name, amount, remaining_amount, reason, status, issue_date, due_date').eq('borrower_id', borrowerId).order('created_at', { ascending: false });
  },
  async create(data: Partial<InternalLoan>) {
    return supabase.from('internal_loans').insert(data).select().single();
  },
  async partialSettle(id: string, amount: number) {
    const { data: loan } = await supabase.from('internal_loans').select('remaining_amount').eq('id', id).single();
    if (!loan) return { data: null, error: new Error('Loan not found') };
    const newRemaining = Math.max(0, loan.remaining_amount - amount);
    const update: Partial<InternalLoan> = { remaining_amount: newRemaining };
    if (newRemaining === 0) {
      update.status = 'settled';
      update.settled_date = new Date().toISOString();
    } else {
      update.status = 'partial';
    }
    return supabase.from('internal_loans').update(update).eq('id', id).select().single();
  },
  async fullSettle(id: string) {
    return supabase.from('internal_loans').update({
      remaining_amount: 0,
      status: 'settled',
      settled_date: new Date().toISOString(),
    }).eq('id', id).select().single();
  },
  async getCustodianBalance(borrowerId: string, loanType: InternalLoan['loan_type']) {
    return supabase
      .from('internal_loans')
      .select('amount, remaining_amount')
      .eq('borrower_id', borrowerId)
      .eq('loan_type', loanType)
      .in('status', ['active', 'partial']);
  },
};
