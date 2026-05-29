import { createClient } from '@/lib/supabase/client';
import type { PurchaseInvoice, PurchaseInvoiceItem, InvoiceFormData, PaymentFormData, Payment, PaymentSchedule } from '@/types/erp';

const supabase = createClient();

export const invoiceService = {
  async getAll(params?: {
    status?: string;
    supplier_id?: string;
    from_date?: string;
    to_date?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = supabase.from('purchase_invoices').select('id, invoice_number, supplier_id, supplier_name_ar, invoice_date, due_date, total, paid_amount, remaining_amount, status, importance, created_at', { count: 'exact' });

    if (params?.status) {
      query = query.eq('status', params.status);
    }
    if (params?.supplier_id) {
      query = query.eq('supplier_id', params.supplier_id);
    }
    if (params?.from_date) {
      query = query.gte('invoice_date', params.from_date);
    }
    if (params?.to_date) {
      query = query.lte('invoice_date', params.to_date);
    }
    if (params?.search) {
      query = query.or(`invoice_number.ilike.%${params.search}%,supplier_name_ar.ilike.%${params.search}%`);
    }
    if (params?.limit) {
      query = query.limit(params.limit);
    }
    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
    }

    const { data, error, count } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data as PurchaseInvoice[], count };
  },

  async getById(id: string) {
    const { data: invoice, error } = await supabase
      .from('purchase_invoices')
      .select('id, invoice_number, supplier_id, supplier_name_ar, invoice_date, due_date, total, paid_amount, remaining_amount, status, importance, notes, created_at')
      .eq('id', id)
      .single();

    if (error) throw error;

    const { data: items, error: itemsError } = await supabase
      .from('purchase_invoice_items')
      .select('id, invoice_id, product_id, product_code, product_name_ar, barcode, quantity, unit, unit_price, discount_percent, tax_percent, total')
      .eq('invoice_id', id);

    if (itemsError) throw itemsError;

    return {
      ...invoice,
      items: items as PurchaseInvoiceItem[]
    } as PurchaseInvoice & { items: PurchaseInvoiceItem[] };
  },

  async create(invoice: {
    supplier_id?: string;
    invoice_number: string;
    invoice_date: string;
    due_date?: string;
    importance?: string;
    notes?: string;
    items: {
      product_id?: string;
      product_code?: string;
      product_name_ar?: string;
      barcode?: string;
      quantity: number;
      unit?: string;
      unit_price: number;
      discount_percent?: number;
      tax_percent?: number;
    }[];
    discount_percent?: number;
    tax_percent?: number;
  }) {
    const { data: invoiceData, error: invoiceError } = await supabase
      .from('purchase_invoices')
      .insert({
        invoice_number: invoice.invoice_number,
        supplier_id: invoice.supplier_id,
        invoice_date: invoice.invoice_date,
        due_date: invoice.due_date,
        importance: invoice.importance || 'medium',
        notes: invoice.notes,
        tax_percent: invoice.tax_percent || 15,
        discount_percent: invoice.discount_percent || 0
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    const items = invoice.items.map(item => ({
      invoice_id: invoiceData.id,
      product_id: item.product_id,
      product_code: item.product_code,
      product_name_ar: item.product_name_ar,
      barcode: item.barcode,
      quantity: item.quantity,
      unit: item.unit || 'قطعة',
      unit_price: item.unit_price,
      discount_percent: item.discount_percent || 0,
      tax_percent: item.tax_percent || 15,
      total: item.quantity * item.unit_price
    }));

    const { error: itemsError } = await supabase
      .from('purchase_invoice_items')
      .insert(items);

    if (itemsError) throw itemsError;

    await supabase.rpc('calculate_invoice_totals', { invoice_uuid: invoiceData.id });

    return invoiceData as PurchaseInvoice;
  },

  async update(id: string, invoice: Partial<PurchaseInvoice>) {
    const { data, error } = await supabase
      .from('purchase_invoices')
      .update(invoice)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as PurchaseInvoice;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('purchase_invoices')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  async approve(id: string, approvedBy: string) {
    const { data, error } = await supabase
      .from('purchase_invoices')
      .update({
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    const invoice = await this.getById(id);
    if (invoice.items) {
      for (const item of invoice.items) {
        if (item.product_id) {
          const { data: stock } = await supabase
            .from('inventory_stock')
            .select('quantity')
            .eq('product_id', item.product_id)
            .eq('warehouse_id', '00000000-0000-0000-0000-000000000001')
            .single();

          if (stock) {
            await supabase
              .from('inventory_stock')
              .update({ quantity: stock.quantity + item.quantity })
              .eq('product_id', item.product_id)
              .eq('warehouse_id', '00000000-0000-0000-0000-000000000001');
          } else {
            await supabase
              .from('inventory_stock')
              .insert({
                product_id: item.product_id,
                warehouse_id: '00000000-0000-0000-0000-000000000001',
                quantity: item.quantity
              });
          }

          await supabase.from('stock_movements').insert({
            product_id: item.product_id,
            warehouse_id: '00000000-0000-0000-0000-000000000001',
            movement_type: 'purchase',
            quantity: item.quantity,
            reference_type: 'purchase_invoice',
            reference_id: id
          });
        }
      }
    }

    return data as PurchaseInvoice;
  },

  async generateInvoiceNumber(prefix: string = 'PI') {
    const { data, error } = await supabase.rpc('generate_invoice_number', { prefix });
    if (error) throw error;
    return data;
  },

  async getPaymentSchedules(invoiceId: string) {
    const { data, error } = await supabase
      .from('payment_schedules')
      .select('id, invoice_id, installment_number, amount, due_date, status, paid_at')
      .eq('invoice_id', invoiceId)
      .order('installment_number');

    if (error) throw error;
    return data as PaymentSchedule[];
  },

  async createPaymentSchedule(schedule: Partial<PaymentSchedule>) {
    const { data, error } = await supabase
      .from('payment_schedules')
      .insert(schedule)
      .select()
      .single();

    if (error) throw error;
    return data as PaymentSchedule;
  }
};

export const paymentService = {
  async getAll(params?: {
    supplier_id?: string;
    invoice_id?: string;
    from_date?: string;
    to_date?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = supabase.from('payments').select('id, payment_number, supplier_id, invoice_id, amount, payment_type, payment_date, reference_number, bank_name, check_number, notes, created_at', { count: 'exact' });

    if (params?.supplier_id) {
      query = query.eq('supplier_id', params.supplier_id);
    }
    if (params?.invoice_id) {
      query = query.eq('invoice_id', params.invoice_id);
    }
    if (params?.from_date) {
      query = query.gte('payment_date', params.from_date);
    }
    if (params?.to_date) {
      query = query.lte('payment_date', params.to_date);
    }
    if (params?.limit) {
      query = query.limit(params.limit);
    }
    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
    }

    const { data, error, count } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data as Payment[], count };
  },

  async create(payment: {
    supplier_id: string;
    invoice_id?: string;
    amount: number;
    payment_type: string;
    payment_date: string;
    reference_number?: string;
    bank_name?: string;
    check_number?: string;
    notes?: string;
  }) {
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .insert({
        payment_number: await this.generatePaymentNumber(),
        ...payment
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    if (payment.invoice_id) {
      const { data: invoice } = await supabase
        .from('purchase_invoices')
        .select('paid_amount, total')
        .eq('id', payment.invoice_id)
        .single();

      if (invoice) {
        const newPaidAmount = invoice.paid_amount + payment.amount;
        const newStatus = newPaidAmount >= invoice.total ? 'paid' : 'approved';

        await supabase
          .from('purchase_invoices')
          .update({
            paid_amount: newPaidAmount,
            remaining_amount: invoice.total - newPaidAmount,
            status: newStatus
          })
          .eq('id', payment.invoice_id);
      }
    }

    if (payment.supplier_id) {
      await supabase.rpc('update_supplier_balance', {
        supplier_uuid: payment.supplier_id,
        amount: payment.amount,
        is_credit: false
      });
    }

    return paymentData as Payment;
  },

  async generatePaymentNumber(prefix: string = 'PAY') {
    const year = new Date().getFullYear();
    const { data } = await supabase
      .from('payments')
      .select('payment_number')
      .like('payment_number', `${prefix}${year}%`)
      .order('payment_number', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      const lastNumber = parseInt(data.payment_number.slice(-6));
      return `${prefix}${year}${String(lastNumber + 1).padStart(6, '0')}`;
    }
    return `${prefix}${year}000001`;
  }
};