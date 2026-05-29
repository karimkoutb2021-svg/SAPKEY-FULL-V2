import { createClient } from '@/lib/supabase/client';
import type { Product, ProductSupplier, InventoryStock } from '@/types/erp';

const supabase = createClient();

export const productService = {
  async getAll(params?: {
    category_id?: string;
    search?: string;
    barcode?: string;
    is_active?: boolean;
    low_stock?: boolean;
    limit?: number;
    offset?: number;
    fields?: string;
  }) {
    let query = supabase.from('products').select(params?.fields || '*', { count: 'exact' });

    if (params?.category_id) {
      query = query.eq('category_id', params.category_id);
    }
    if (params?.search) {
      query = query.or(`name_ar.ilike.%${params.search}%,name_en.ilike.%${params.search}%,sku.ilike.%${params.search}%`);
    }
    if (params?.barcode) {
      query = query.eq('barcode', params.barcode);
    }
    if (params?.is_active !== undefined) {
      query = query.eq('is_active', params.is_active);
    }
    if (params?.low_stock) {
      query = query.lte('current_stock', query.select('min_stock_level'));
    }
    if (params?.limit) {
      query = query.limit(params.limit);
    }
    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
    }

    const { data, error, count } = await query.order('name_ar');

    if (error) throw error;
    return { data: data as unknown as Product[], count };
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Product;
  },

  async getByBarcode(barcode: string) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', barcode)
      .single();

    if (error) return null;
    return data as Product;
  },

  async getBySku(sku: string) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('sku', sku)
      .single();

    if (error) return null;
    return data as Product;
  },

  async create(product: {
    sku: string;
    barcode?: string;
    name_ar: string;
    name_en?: string;
    category_id?: string;
    unit?: string;
    unit_price?: number;
    cost_price?: number;
    sale_price?: number;
    min_stock_level?: number;
    description?: string;
  }) {
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single();

    if (error) throw error;
    return data as Product;
  },

  async update(id: string, product: Partial<Product>) {
    const { data, error } = await supabase
      .from('products')
      .update(product)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Product;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  async generateSku(categoryCode?: string) {
    const prefix = categoryCode || 'PROD';
    const year = new Date().getFullYear().toString().slice(-2);

    const { data } = await supabase
      .from('products')
      .select('sku')
      .like('sku', `${prefix}${year}%`)
      .order('sku', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      const lastNumber = parseInt(data.sku.slice(-4));
      return `${prefix}${year}${String(lastNumber + 1).padStart(4, '0')}`;
    }
    return `${prefix}${year}0001`;
  },

  async searchByVoice(query: string, language: 'ar' | 'en' = 'ar') {
    const field = language === 'ar' ? 'name_ar' : 'name_en';
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .ilike(field, `%${query}%`)
      .eq('is_active', true)
      .limit(20);

    if (error) throw error;
    return data as Product[];
  },

  async getSuppliers(productId: string) {
    const { data, error } = await supabase
      .from('product_suppliers')
      .select('*, supplier:suppliers(id, name, company_name, contact_person, phone, email)')
      .eq('product_id', productId)
      .order('is_preferred', { ascending: false });

    if (error) throw error;
    return data as (ProductSupplier & { supplier: unknown })[];
  },

  async addSupplier(productId: string, supplierId: string, supplierCode?: string, unitPrice?: number) {
    const { data, error } = await supabase
      .from('product_suppliers')
      .insert({
        product_id: productId,
        supplier_id: supplierId,
        supplier_product_code: supplierCode,
        unit_price: unitPrice
      })
      .select()
      .single();

    if (error) throw error;
    return data as ProductSupplier;
  },

  async getInventory(productId: string) {
    const { data, error } = await supabase
      .from('inventory_stock')
      .select('*, warehouse:warehouses(id, name, name_ar, type, location)')
      .eq('product_id', productId);

    if (error) throw error;
    return data as (InventoryStock & { warehouse: unknown })[];
  },

  async updateStock(productId: string, warehouseId: string, quantity: number, type: 'add' | 'set' = 'set') {
    const { data: existing } = await supabase
      .from('inventory_stock')
      .select('quantity')
      .eq('product_id', productId)
      .eq('warehouse_id', warehouseId)
      .single();

    if (existing) {
      const newQuantity = type === 'add' ? existing.quantity + quantity : quantity;
      const { error } = await supabase
        .from('inventory_stock')
        .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
        .eq('product_id', productId)
        .eq('warehouse_id', warehouseId);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('inventory_stock')
        .insert({
          product_id: productId,
          warehouse_id: warehouseId,
          quantity
        });

      if (error) throw error;
    }

    await supabase.from('stock_movements').insert({
      product_id: productId,
      warehouse_id: warehouseId,
      movement_type: type === 'add' ? 'purchase' : 'adjustment',
      quantity
    });
  }
};

export const inventoryService = {
  async getStock(warehouseId?: string) {
    let query = supabase
      .from('inventory_stock')
      .select('*, product:products(id, sku, name_ar, name_en, sale_price, unit, barcode), warehouse:warehouses(id, name, name_ar, type, location)');

    if (warehouseId) {
      query = query.eq('warehouse_id', warehouseId);
    }

    const { data, error } = await query.order('quantity');

    if (error) throw error;
    return data;
  },

  async getLowStock(threshold?: number) {
    const { data: products, error } = await supabase
      .from('products')
      .select('*, inventory:inventory_stock(id, warehouse_id, quantity, updated_at)')
      .eq('is_active', true);

    if (error) throw error;
    
    if (!products) return [];
    
    return products.filter(p => 
      p.current_stock <= (threshold ?? p.min_stock_level)
    );
  },

  async adjustStock(productId: string, warehouseId: string, quantity: number, reason: string, userId: string) {
    await productService.updateStock(productId, warehouseId, quantity, 'set');

    await supabase.from('stock_movements').insert({
      product_id: productId,
      warehouse_id: warehouseId,
      movement_type: 'adjustment',
      quantity,
      notes: reason,
      created_by: userId
    });

    return true;
  },

  async transferStock(fromWarehouseId: string, toWarehouseId: string, productId: string, quantity: number, userId: string) {
    await productService.updateStock(productId, fromWarehouseId, quantity, 'add');

    await productService.updateStock(productId, toWarehouseId, -quantity, 'add');

    await supabase.from('stock_movements').insert([
      {
        product_id: productId,
        warehouse_id: fromWarehouseId,
        movement_type: 'transfer',
        quantity: -quantity,
        notes: `نقل إلى المستودع ${toWarehouseId}`,
        created_by: userId
      },
      {
        product_id: productId,
        warehouse_id: toWarehouseId,
        movement_type: 'transfer',
        quantity,
        notes: `نقل من المستودع ${fromWarehouseId}`,
        created_by: userId
      }
    ]);

    return true;
  }
};