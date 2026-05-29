import { createClient } from '@/lib/supabase/client';

export interface CustomerWallet {
  id: string;
  customer_id: string;
  balance: number;
  loyalty_points: number;
  total_recharged: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  customer_id: string;
  type: 'deposit' | 'withdrawal' | 'purchase' | 'refund' | 'loyalty_earned' | 'loyalty_redeemed';
  amount: number;
  balance_after?: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

const supabase = createClient();

export const walletService = {
  async getWallet(customerId: string) {
    const { data, error } = await supabase
      .from('customer_wallets')
      .select('id, customer_id, balance, loyalty_points, total_recharged, total_spent, created_at, updated_at')
      .eq('customer_id', customerId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    if (!data) {
      const { data: newWallet, error: createError } = await supabase
        .from('customer_wallets')
        .insert({ customer_id: customerId, balance: 0, loyalty_points: 0, total_recharged: 0, total_spent: 0 })
        .select()
        .single();
      if (createError) throw createError;
      return newWallet as CustomerWallet;
    }
    return data as CustomerWallet;
  },

  async deposit(customerId: string, amount: number, notes?: string, createdBy?: string) {
    const wallet = await this.getWallet(customerId);
    const newBalance = wallet.balance + amount;
    const newTotalRecharged = wallet.total_recharged + amount;

    const { error: walletError } = await supabase
      .from('customer_wallets')
      .update({ balance: newBalance, total_recharged: newTotalRecharged, updated_at: new Date().toISOString() })
      .eq('id', wallet.id);
    if (walletError) throw walletError;

    const { data, error } = await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: wallet.id,
        customer_id: customerId,
        type: 'deposit',
        amount,
        balance_after: newBalance,
        notes,
        created_by: createdBy,
      })
      .select()
      .single();
    if (error) throw error;
    return data as WalletTransaction;
  },

  async withdraw(customerId: string, amount: number, notes?: string) {
    const wallet = await this.getWallet(customerId);
    if (wallet.balance < amount) throw new Error('رصيد غير كافٍ');

    const newBalance = wallet.balance - amount;

    const { error: walletError } = await supabase
      .from('customer_wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', wallet.id);
    if (walletError) throw walletError;

    const { data, error } = await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: wallet.id,
        customer_id: customerId,
        type: 'withdrawal',
        amount: -amount,
        balance_after: newBalance,
        notes,
      })
      .select()
      .single();
    if (error) throw error;
    return data as WalletTransaction;
  },

  async payFromWallet(customerId: string, amount: number, orderId?: string) {
    const wallet = await this.getWallet(customerId);
    if (wallet.balance < amount) throw new Error('رصيد غير كافٍ');

    const newBalance = wallet.balance - amount;
    const newTotalSpent = wallet.total_spent + amount;

    const { error: walletError } = await supabase
      .from('customer_wallets')
      .update({ balance: newBalance, total_spent: newTotalSpent, updated_at: new Date().toISOString() })
      .eq('id', wallet.id);
    if (walletError) throw walletError;

    const { data, error } = await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: wallet.id,
        customer_id: customerId,
        type: 'purchase',
        amount: -amount,
        balance_after: newBalance,
        reference_type: 'order',
        reference_id: orderId,
      })
      .select()
      .single();
    if (error) throw error;
    return data as WalletTransaction;
  },

  async addLoyaltyPoints(customerId: string, points: number, orderId?: string) {
    const wallet = await this.getWallet(customerId);
    const newPoints = wallet.loyalty_points + points;

    const { error: walletError } = await supabase
      .from('customer_wallets')
      .update({ loyalty_points: newPoints, updated_at: new Date().toISOString() })
      .eq('id', wallet.id);
    if (walletError) throw walletError;

    const { data, error } = await supabase
      .from('loyalty_points')
      .insert({
        customer_id: customerId,
        points,
        type: 'earned',
        reference_type: 'order',
        reference_id: orderId,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async redeemLoyaltyPoints(customerId: string, points: number) {
    const wallet = await this.getWallet(customerId);
    if (wallet.loyalty_points < points) throw new Error('نقاط ولاء غير كافية');

    const newPoints = wallet.loyalty_points - points;
    const discountAmount = points * 0.01;

    const { error: walletError } = await supabase
      .from('customer_wallets')
      .update({ loyalty_points: newPoints, updated_at: new Date().toISOString() })
      .eq('id', wallet.id);
    if (walletError) throw walletError;

    const { data, error } = await supabase
      .from('loyalty_points')
      .insert({
        customer_id: customerId,
        points: -points,
        type: 'redeemed',
        notes: `تم استبدال ${points} نقطة بخصم ${discountAmount} ج.م`,
      })
      .select()
      .single();
    if (error) throw error;
    return { transaction: data, discountAmount };
  },

  async getTransactions(customerId: string, limit = 50) {
    const wallet = await this.getWallet(customerId);
    const { data, error, count } = await supabase
      .from('wallet_transactions')
      .select('id, wallet_id, customer_id, type, amount, description, reference, status, created_at')
      .eq('wallet_id', wallet.id)
      .limit(limit)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { data: data as WalletTransaction[], count };
  },

  async subscribeToWallet(customerId: string, callback: (wallet: CustomerWallet) => void) {
    const wallet = await this.getWallet(customerId);
    const channel = supabase
      .channel('wallet-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'customer_wallets', filter: `id=eq.${wallet.id}` },
        (payload) => callback(payload.new as CustomerWallet)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
