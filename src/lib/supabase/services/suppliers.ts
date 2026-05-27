import { createClient } from '@/lib/supabase/client';
import type { Supplier, SupplierCategory, SupplierContact, SupplierDocument, SupplierNote, SupplierFormData } from '@/types/erp';

const supabase = createClient();

export const supplierService = {
  async getAll(params?: {
    status?: string;
    category_id?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = supabase.from('suppliers').select('*', { count: 'exact' });

    if (params?.status) {
      query = query.eq('status', params.status);
    }
    if (params?.category_id) {
      query = query.eq('category_id', params.category_id);
    }
    if (params?.search) {
      query = query.or(`name_ar.ilike.%${params.search}%,code.ilike.%${params.search}%`);
    }
    if (params?.limit) {
      query = query.limit(params.limit);
    }
    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
    }

    const { data, error, count } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data as Supplier[], count };
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Supplier;
  },

  async create(supplier: SupplierFormData) {
    const { data, error } = await supabase
      .from('suppliers')
      .insert(supplier)
      .select()
      .single();

    if (error) throw error;
    return data as Supplier;
  },

  async update(id: string, supplier: Partial<SupplierFormData>) {
    const { data, error } = await supabase
      .from('suppliers')
      .update(supplier)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Supplier;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  async updateBalance(id: string, amount: number, isCredit: boolean) {
    const { error } = await supabase.rpc('update_supplier_balance', {
      supplier_uuid: id,
      amount,
      is_credit: isCredit
    });

    if (error) throw error;
    return true;
  },

  async getCategories() {
    const { data, error } = await supabase
      .from('supplier_categories')
      .select('*')
      .eq('is_active', true)
      .order('name_ar');

    if (error) throw error;
    return data as SupplierCategory[];
  },

  async getContacts(supplierId: string) {
    const { data, error } = await supabase
      .from('supplier_contacts')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('is_primary', { ascending: false });

    if (error) throw error;
    return data as SupplierContact[];
  },

  async addContact(supplierId: string, contact: Partial<SupplierContact>) {
    const { data, error } = await supabase
      .from('supplier_contacts')
      .insert({ ...contact, supplier_id: supplierId })
      .select()
      .single();

    if (error) throw error;
    return data as SupplierContact;
  },

  async getDocuments(supplierId: string) {
    const { data, error } = await supabase
      .from('supplier_documents')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as SupplierDocument[];
  },

  async addDocument(supplierId: string, document: Partial<SupplierDocument>) {
    const { data, error } = await supabase
      .from('supplier_documents')
      .insert({ ...document, supplier_id: supplierId })
      .select()
      .single();

    if (error) throw error;
    return data as SupplierDocument;
  },

  async deleteDocument(id: string) {
    const { error } = await supabase
      .from('supplier_documents')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  async getNotes(supplierId: string) {
    const { data, error } = await supabase
      .from('supplier_notes')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as SupplierNote[];
  },

  async addNote(supplierId: string, content: string, isImportant: boolean = false) {
    const { data, error } = await supabase
      .from('supplier_notes')
      .insert({
        supplier_id: supplierId,
        content,
        is_important: isImportant
      })
      .select()
      .single();

    if (error) throw error;
    return data as SupplierNote;
  },

  async deleteNote(id: string) {
    const { error } = await supabase
      .from('supplier_notes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  async getAccountStatement(supplierId: string, fromDate: string, toDate: string) {
    const { data, error } = await supabase
      .from('supplier_ledger')
      .select('*')
      .eq('supplier_id', supplierId)
      .gte('entry_date', fromDate)
      .lte('entry_date', toDate)
      .order('entry_date');

    if (error) throw error;
    return data;
  }
};

export const categoryService = {
  async getAll() {
    const { data, error } = await supabase
      .from('supplier_categories')
      .select('*')
      .eq('is_active', true)
      .order('name_ar');

    if (error) throw error;
    return data as SupplierCategory[];
  },

  async create(category: { name_ar: string; name_en?: string; code: string; description?: string }) {
    const { data, error } = await supabase
      .from('supplier_categories')
      .insert(category)
      .select()
      .single();

    if (error) throw error;
    return data as SupplierCategory;
  },

  async update(id: string, category: Partial<SupplierCategory>) {
    const { data, error } = await supabase
      .from('supplier_categories')
      .update(category)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as SupplierCategory;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('supplier_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }
};