import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export interface Warehouse {
  id: string;
  name: string;
  name_ar: string;
  type: 'main' | 'branch' | 'cold_storage' | 'dry_storage' | 'display';
  location?: string;
  address?: string;
  capacity?: number;
  is_active: boolean;
  created_at: string;
}

export interface CodingDraft {
  id: string;
  request_type?: 'create' | 'update' | 'delete';
  product_code: string;
  product_name: string;
  category?: string;
  subcategory?: string;
  unit: string;
  shelf_number?: string;
  cost_price: number;
  selling_price: number;
  min_stock: number;
  status: 'pending' | 'approved' | 'rejected' | 'active';
  submitted_by?: string;
  submitted_by_name?: string;
  submitted_by_role?: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  voice_input?: any;
  created_at: string;
}

export interface AuditItem {
  id: string;
  audit_session_id: string;
  stock_item_id?: string;
  product_name: string;
  product_sku?: string;
  system_qty: number;
  actual_qty: number;
  variance: number;
  variance_value: number;
  cost_price: number;
  status: 'matched' | 'shortage' | 'overage' | 'damaged' | 'not_found';
  notes?: string;
  shelf_location?: string;
  voice_input?: string;
  ocr_confidence?: number;
  created_at: string;
}

export interface StockTransfer {
  id: string;
  transfer_number: string;
  from_warehouse_id?: string;
  to_warehouse_id?: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'in_transit' | 'received' | 'cancelled';
  total_items: number;
  notes?: string;
  requested_by?: string;
  requested_by_name?: string;
  approved_by?: string;
  approved_at?: string;
  received_by?: string;
  received_by_name?: string;
  received_at?: string;
  created_at: string;
}

export interface TransferItem {
  id: string;
  transfer_id: string;
  stock_item_id?: string;
  product_name: string;
  product_sku?: string;
  requested_qty: number;
  approved_qty: number;
  received_qty: number;
  unit: string;
  notes?: string;
  created_at: string;
}

export interface ProductHistory {
  id: string;
  stock_item_id?: string;
  product_name: string;
  type: 'purchase' | 'sale' | 'transfer_in' | 'transfer_out' | 'adjustment' | 'audit' | 'damage' | 'return' | 'coding';
  quantity: number;
  price: number;
  total_value: number;
  reference_id?: string;
  reference_type?: string;
  from_warehouse_id?: string;
  to_warehouse_id?: string;
  performed_by?: string;
  performed_by_name?: string;
  notes?: string;
  created_at: string;
}

export interface AuditOCRResult {
  id: string;
  audit_session_id: string;
  image_url: string;
  ocr_text?: string;
  extracted_items?: any;
  processing_status: string;
  confidence_score?: number;
  error_message?: string;
  processed_at?: string;
  created_at: string;
}

export interface CodingLabel {
  id: string;
  stock_item_id?: string;
  product_name: string;
  product_sku?: string;
  selling_price: number;
  label_type: string;
  barcode_data?: string;
  qr_data?: string;
  printed: boolean;
  printed_at?: string;
  printed_by?: string;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier_id?: string;
  supplier_name?: string;
  status: 'draft' | 'pending' | 'approved' | 'received' | 'partial' | 'cancelled';
  total_items: number;
  subtotal: number;
  tax: number;
  total: number;
  expected_date?: string;
  received_date?: string;
  notes?: string;
  created_by?: string;
  created_by_name?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  stock_item_id?: string;
  product_name: string;
  product_sku?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  received_qty: number;
  unit: string;
  notes?: string;
  created_at: string;
}

export const warehouseService = {
  async getAll() {
    return supabase.from('warehouses').select('id, name, name_ar, type, location, address, capacity, is_active').eq('is_active', true).order('name_ar');
  },
  async getById(id: string) {
    return supabase.from('warehouses').select('*').eq('id', id).single();
  },
  async create(data: Partial<Warehouse>) {
    return supabase.from('warehouses').insert(data).select().single();
  },
  async update(id: string, data: Partial<Warehouse>) {
    return supabase.from('warehouses').update(data).eq('id', id).select().single();
  },
};

export const codingDraftService = {
  async getAll(status?: string) {
    let query = supabase.from('coding_drafts').select('id, request_type, product_code, product_name, category, unit, cost_price, selling_price, status, created_at').order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    return query;
  },
  async getById(id: string) {
    return supabase.from('coding_drafts').select('*').eq('id', id).single();
  },
  async create(data: Partial<CodingDraft>) {
    return supabase.from('coding_drafts').insert(data).select().single();
  },
  async approve(id: string, approvedBy: string) {
    return supabase.from('coding_drafts').update({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    }).eq('id', id).select().single();
  },
  async reject(id: string, reason: string) {
    return supabase.from('coding_drafts').update({
      status: 'rejected',
      rejection_reason: reason,
    }).eq('id', id).select().single();
  },
};

export const auditItemService = {
  async getAll(sessionId?: string) {
    let query = supabase.from('audit_items').select('id, audit_session_id, stock_item_id, product_name, product_sku, system_qty, actual_qty, variance, variance_value, cost_price, status').order('created_at');
    if (sessionId) query = query.eq('audit_session_id', sessionId);
    return query;
  },
  async create(data: Partial<AuditItem>) {
    return supabase.from('audit_items').insert(data).select().single();
  },
  async update(id: string, data: Partial<AuditItem>) {
    return supabase.from('audit_items').update(data).eq('id', id).select().single();
  },
  async getVarianceReport(sessionId: string) {
    return supabase.from('audit_items')
      .select('id, product_name, product_sku, system_qty, actual_qty, variance, variance_value, status')
      .eq('audit_session_id', sessionId)
      .neq('variance', 0)
      .order('variance', { ascending: true });
  },
};

export const transferService = {
  async getAll(status?: string) {
    let query = supabase.from('stock_transfers')
      .select('*, from_warehouse:from_warehouse_id(name, name_ar), to_warehouse:to_warehouse_id(name, name_ar)')
      .order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    return query;
  },
  async getById(id: string) {
    return supabase.from('stock_transfers')
      .select('*, items:transfer_items(*)')
      .eq('id', id)
      .single();
  },
  async create(data: Partial<StockTransfer>) {
    return supabase.from('stock_transfers').insert(data).select().single();
  },
  async update(id: string, data: Partial<StockTransfer>) {
    return supabase.from('stock_transfers').update(data).eq('id', id).select().single();
  },
  async approve(id: string, approvedBy: string) {
    return supabase.from('stock_transfers').update({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    }).eq('id', id).select().single();
  },
  async receive(id: string, receivedBy: string, receivedByName: string) {
    return supabase.from('stock_transfers').update({
      status: 'received',
      received_by: receivedBy,
      received_by_name: receivedByName,
      received_at: new Date().toISOString(),
    }).eq('id', id).select().single();
  },
};

export const transferItemService = {
  async getAll(transferId: string) {
    return supabase.from('transfer_items').select('id, transfer_id, product_name, product_sku, requested_qty, approved_qty, received_qty, unit').eq('transfer_id', transferId).order('created_at');
  },
  async create(data: Partial<TransferItem>) {
    return supabase.from('transfer_items').insert(data).select().single();
  },
  async update(id: string, data: Partial<TransferItem>) {
    return supabase.from('transfer_items').update(data).eq('id', id).select().single();
  },
};

export const productHistoryService = {
  async getAll(stockItemId?: string, type?: string) {
    let query = supabase.from('product_history').select('id, product_name, type, quantity, price, total_value, created_at, performed_by_name').order('created_at', { ascending: false });
    if (stockItemId) query = query.eq('stock_item_id', stockItemId);
    if (type) query = query.eq('type', type);
    return query.limit(100);
  },
  async create(data: Partial<ProductHistory>) {
    return supabase.from('product_history').insert(data).select().single();
  },
  async getSummary(stockItemId: string) {
    const { data } = await supabase.from('product_history')
      .select('type, quantity, total_value, created_at')
      .eq('stock_item_id', stockItemId)
      .order('created_at', { ascending: false })
      .limit(50);
    return { data: data || [], error: null };
  },
};

export const auditOCRService = {
  async getAll(sessionId?: string) {
    let query = supabase.from('audit_ocr_results').select('id, audit_session_id, image_url, processing_status, confidence_score, created_at').order('created_at', { ascending: false });
    if (sessionId) query = query.eq('audit_session_id', sessionId);
    return query;
  },
  async create(data: Partial<AuditOCRResult>) {
    return supabase.from('audit_ocr_results').insert(data).select().single();
  },
  async update(id: string, data: Partial<AuditOCRResult>) {
    return supabase.from('audit_ocr_results').update(data).eq('id', id).select().single();
  },
};

export const codingLabelService = {
  async getAll(printed?: boolean) {
    let query = supabase.from('coding_labels').select('id, product_name, product_sku, selling_price, label_type, printed, printed_at, created_at').order('created_at', { ascending: false });
    if (printed !== undefined) query = query.eq('printed', printed);
    return query;
  },
  async create(data: Partial<CodingLabel>) {
    return supabase.from('coding_labels').insert(data).select().single();
  },
  async markPrinted(id: string) {
    return supabase.from('coding_labels').update({
      printed: true,
      printed_at: new Date().toISOString(),
    }).eq('id', id).select().single();
  },
};

export const purchaseOrderService = {
  async getAll(status?: string) {
    let query = supabase.from('purchase_orders')
      .select('*, items:purchase_order_items(count)')
      .order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    return query;
  },
  async getById(id: string) {
    return supabase.from('purchase_orders')
      .select('*, items:purchase_order_items(*)')
      .eq('id', id)
      .single();
  },
  async create(data: Partial<PurchaseOrder>) {
    return supabase.from('purchase_orders').insert(data).select().single();
  },
  async update(id: string, data: Partial<PurchaseOrder>) {
    return supabase.from('purchase_orders').update(data).eq('id', id).select().single();
  },
  async approve(id: string, approvedBy: string) {
    return supabase.from('purchase_orders').update({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    }).eq('id', id).select().single();
  },
};

export const purchaseOrderItemService = {
  async getAll(orderId: string) {
    return supabase.from('purchase_order_items').select('id, purchase_order_id, product_name, product_sku, quantity, unit_price, total_price, received_qty, unit').eq('purchase_order_id', orderId).order('created_at');
  },
  async create(data: Partial<PurchaseOrderItem>) {
    return supabase.from('purchase_order_items').insert(data).select().single();
  },
  async update(id: string, data: Partial<PurchaseOrderItem>) {
    return supabase.from('purchase_order_items').update(data).eq('id', id).select().single();
  },
};
