import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export interface StockItem {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  current_qty: number;
  min_qty: number;
  max_qty: number;
  unit: string;
  cost_price: number;
  selling_price: number;
  location?: string;
  last_audit_date?: string;
  last_audit_by?: string;
  created_at: string;
  updated_at: string;
}

export interface StockAdjustment {
  id: string;
  stock_id: string;
  type: 'add' | 'remove' | 'correction' | 'damage' | 'return' | 'audit';
  quantity: number;
  reason?: string;
  performed_by?: string;
  performed_at: string;
  balance_before: number;
  balance_after: number;
  attachment_url?: string;
  created_at: string;
}

export interface AuditSession {
  id: string;
  type: 'voice' | 'ocr' | 'manual';
  status: 'in_progress' | 'completed' | 'cancelled';
  initiated_by?: string;
  created_at: string;
  completed_at?: string;
  differences?: any;
}

export const inventoryService = {
  async getAll() {
    const [stockRes, prodRes] = await Promise.all([
      supabase.from('stock_items').select('id, product_id, product_name, sku, current_qty, min_qty, unit, cost_price, selling_price, barcode').order('product_name'),
      supabase.from('products').select('id, name_ar, category_id, image_url')
    ]);
    if (stockRes.error) return stockRes;
    const products = prodRes.data || [];
    const merged = stockRes.data.map(item => {
      const p = products.find(prod => prod.id === item.product_id);
      return {
        ...item,
        image_url: p?.image_url || null,
        category: p?.category_id || null, // Map category_id for filtering
      };
    });
    return { data: merged, error: null };
  },
  async getById(id: string) {
    return supabase.from('stock_items').select('*').eq('id', id).single();
  },
  async update(id: string, data: Partial<StockItem>) {
    return supabase.from('stock_items').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  },
  async getLowStock() {
    const { data, error } = await supabase.from('stock_items').select('id, product_id, product_name, sku, current_qty, min_qty, max_qty, unit, cost_price, selling_price, barcode, category_id').order('current_qty', { ascending: true });
    if (error) return { data: [], error };
    const lowStock = data.filter(item => item.current_qty <= item.min_qty && item.current_qty > 0);
    return { data: lowStock, error: null };
  },
};

export const stockAdjustmentService = {
  async getAll(stockId?: string) {
    let query = supabase.from('stock_adjustments').select('*, stock_items(product_name)').order('created_at', { ascending: false });
    if (stockId) query = query.eq('stock_id', stockId);
    return query;
  },
  async create(data: Partial<StockAdjustment>) {
    return supabase.from('stock_adjustments').insert(data).select().single();
  },
};

export const auditService = {
  async getAll() {
    return supabase.from('audit_sessions').select('id, type, status, initiated_by, created_at, completed_at, differences').order('created_at', { ascending: false });
  },
  async create(data: Partial<AuditSession>) {
    const res = await fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error);
    return { data: result.data, error: null };
  },
  async update(id: string, data: Partial<AuditSession>) {
    return supabase.from('audit_sessions').update(data).eq('id', id).select().single();
  },
};
