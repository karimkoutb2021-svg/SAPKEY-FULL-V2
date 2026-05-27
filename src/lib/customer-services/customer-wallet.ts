import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export interface CustomerWallet {
  id: string;
  user_id: string;
  balance: number;
  loyalty_points: number;
  total_recharged: number;
  total_spent: number;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  amount: number;
  type: 'recharge' | 'payment' | 'refund' | 'bonus' | 'transfer';
  method?: 'cashier' | 'transfer_code' | 'card' | 'coupon';
  reference?: string;
  notes?: string;
  created_at: string;
}

export interface Coupon {
  id: string;
  user_id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order: number;
  is_used: boolean;
  expires_at: string;
}

export const customerWalletService = {
  async getWallet(userId: string): Promise<CustomerWallet | null> {
    let { data } = await supabase.from('customer_wallets').select('*').eq('user_id', userId).maybeSingle();
    if (!data) {
      const { data: newWallet } = await supabase.from('customer_wallets').insert({ user_id: userId, balance: 0, loyalty_points: 0 }).select().single();
      return newWallet as CustomerWallet;
    }
    return data as CustomerWallet;
  },

  async getTransactions(walletId: string): Promise<WalletTransaction[]> {
    const { data } = await supabase.from('wallet_transactions').select('*').eq('wallet_id', walletId).order('created_at', { ascending: false }).limit(50);
    return (data || []) as WalletTransaction[];
  },

  async recharge(walletId: string, amount: number, method: 'cashier' | 'transfer_code' | 'card', reference?: string): Promise<CustomerWallet> {
    await supabase.from('wallet_transactions').insert({ wallet_id: walletId, amount, type: 'recharge', method, reference });
    const { data } = await supabase.rpc('increment_wallet_balance', { wallet_id: walletId, inc_amount: amount });
    if (!data) {
      const { data: wallet } = await supabase.from('customer_wallets').select('*').eq('id', walletId).single();
      const newBalance = (wallet?.balance || 0) + amount;
      const { data: updated } = await supabase.from('customer_wallets').update({ balance: newBalance, total_recharged: (wallet?.total_recharged || 0) + amount }).eq('id', walletId).select().single();
      return updated as CustomerWallet;
    }
    return data as CustomerWallet;
  },

  async payFromWallet(walletId: string, amount: number, orderId?: string): Promise<CustomerWallet> {
    await supabase.from('wallet_transactions').insert({ wallet_id: walletId, amount: -amount, type: 'payment', reference: orderId });
    const { data: wallet } = await supabase.from('customer_wallets').select('*').eq('id', walletId).single();
    const newBalance = (wallet?.balance || 0) - amount;
    const { data: updated } = await supabase.from('customer_wallets').update({ balance: newBalance, total_spent: (wallet?.total_spent || 0) + amount }).eq('id', walletId).select().single();
    return updated as CustomerWallet;
  },

  async addLoyaltyPoints(walletId: string, points: number, orderId?: string): Promise<CustomerWallet> {
    await supabase.from('loyalty_transactions').insert({ wallet_id: walletId, points, type: 'earn', order_id: orderId });
    const { data: wallet } = await supabase.from('customer_wallets').select('*').eq('id', walletId).single();
    const newPoints = (wallet?.loyalty_points || 0) + points;
    const { data: updated } = await supabase.from('customer_wallets').update({ loyalty_points: newPoints }).eq('id', walletId).select().single();
    return updated as CustomerWallet;
  },

  async redeemPoints(walletId: string, points: number): Promise<{ coupon: Coupon; wallet: CustomerWallet }> {
    const pointsValue = Math.floor(points / 100) * 10;
    await supabase.from('loyalty_transactions').insert({ wallet_id: walletId, points: -points, type: 'redeem' });
    const { data: wallet } = await supabase.from('customer_wallets').select('*').eq('id', walletId).single();
    const newPoints = (wallet?.loyalty_points || 0) - points;
    await supabase.from('customer_wallets').update({ loyalty_points: newPoints }).eq('id', walletId);
    const code = `LOYAL-${Date.now().toString(36).toUpperCase()}`;
    const { data: coupon } = await supabase.from('coupons').insert({
      user_id: wallet?.user_id,
      code,
      discount_type: 'fixed',
      discount_value: pointsValue,
      min_order: pointsValue,
      expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    }).select().single();
    const { data: updatedWallet } = await supabase.from('customer_wallets').select('*').eq('id', walletId).single();
    return { coupon: coupon as Coupon, wallet: updatedWallet as CustomerWallet };
  },

  async getCoupons(userId: string): Promise<Coupon[]> {
    const { data } = await supabase.from('coupons').select('*').eq('user_id', userId).eq('is_used', false).order('created_at', { ascending: false });
    return (data || []) as Coupon[];
  },
};

export const customerAddressService = {
  async getAddresses(userId: string): Promise<any[]> {
    const { data } = await supabase.from('customer_addresses').select('*').eq('user_id', userId).order('is_default', { ascending: false });
    return (data || []);
  },

  async add(address: { user_id: string; label: string; address_text: string; latitude?: number; longitude?: number; is_default?: boolean }) {
    const { data, error } = await supabase.from('customer_addresses').insert(address).select().single();
    if (error) throw error;
    return data;
  },

  async setDefault(id: string, userId: string) {
    await supabase.from('customer_addresses').update({ is_default: false }).eq('user_id', userId);
    await supabase.from('customer_addresses').update({ is_default: true }).eq('id', id);
  },
};
