import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export interface ImportResult {
  success: boolean;
  totalRows: number;
  successRows: number;
  failedRows: number;
  errors: string[];
}

export const excelExportService = {
  async exportSuppliers() {
    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false });

    if (!suppliers || suppliers.length === 0) {
      throw new Error('لا توجد بيانات للتصدير');
    }

    const exportData = suppliers.map(s => ({
      'الكود': s.code,
      'الاسم عربي': s.name_ar,
      'الاسم إنجليزي': s.name_en || '',
      'الهاتف': s.phone || '',
      'البريد الإلكتروني': s.email || '',
      'العنوان': s.address || '',
      'المدينة': s.city || '',
      'الرصيد الحالي': s.current_balance,
      'حد الائتمان': s.credit_limit,
      'شروط الدفع': s.payment_terms,
      'الحالة': s.status,
      'التاريخ': new Date(s.created_at).toLocaleDateString('ar-EG')
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الموردين');

    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `موردين_${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  async exportInvoices(params?: { from_date?: string; to_date?: string; status?: string }) {
    let query = supabase.from('purchase_invoices').select('*').order('created_at', { ascending: false });
    
    if (params?.from_date) {
      query = query.gte('invoice_date', params.from_date);
    }
    if (params?.to_date) {
      query = query.lte('invoice_date', params.to_date);
    }
    if (params?.status) {
      query = query.eq('status', params.status);
    }

    const { data: invoices } = await query;

    if (!invoices || invoices.length === 0) {
      throw new Error('لا توجد بيانات للتصدير');
    }

    const exportData = invoices.map(inv => ({
      'رقم الفاتورة': inv.invoice_number,
      'المورد': inv.supplier_name_ar || '',
      'تاريخ الفاتورة': inv.invoice_date,
      'تاريخ الاستحقاق': inv.due_date || '',
      'المبلغ الإجمالي': inv.total,
      'المبلغ المدفوع': inv.paid_amount,
      'المبلغ المتبقي': inv.remaining_amount,
      'الحالة': inv.status,
      'الأهمية': inv.importance
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'فواتير المشتريات');

    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `فواتير_المشتريات_${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  async exportProducts() {
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .order('name_ar');

    if (!products || products.length === 0) {
      throw new Error('لا توجد بيانات للتصدير');
    }

    const exportData = products.map(p => ({
      'SKU': p.sku,
      'الباركود': p.barcode || '',
      'الاسم عربي': p.name_ar,
      'الاسم إنجليزي': p.name_en || '',
      'الوحدة': p.unit,
      'سعر التكلفة': p.cost_price,
      'سعر البيع': p.sale_price,
      'الكمية الحالية': p.current_stock,
      'الحد الأدنى': p.min_stock_level,
      'نشط': p.is_active ? 'نعم' : 'لا'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'المنتجات');

    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `المنتجات_${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  getSupplierTemplate() {
    const template = [
      { 'الكود': 'SUP001', 'الاسم عربي': 'اسم المورد', 'الاسم إنجليزي': 'Supplier Name', 'الهاتف': '05xxxxxxxx', 'البريد الإلكتروني': 'email@domain.com', 'العنوان': 'العنوان', 'المدينة': 'المدينة', 'الرصيد الافتتاحي': 0, 'حد الائتمان': 10000, 'شروط الدفع': 30 }
    ];
    
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'قالب الموردين');
    
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'قالب_استيراد_الموردين.xlsx');
  },

  getProductTemplate() {
    const template = [
      { 'SKU': 'PROD001', 'الباركود': '6291234567890', 'الاسم عربي': 'اسم المنتج', 'الاسم إنجليزي': 'Product Name', 'الوحدة': 'قطعة', 'سعر التكلفة': 10, 'سعر البيع': 15, 'الكمية': 100, 'الحد الأدنى': 10 }
    ];
    
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'قالب المنتجات');
    
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'قالب_استيراد_المنتجات.xlsx');
  }
};

export const excelImportService = {
  async importSuppliers(file: File): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      totalRows: 0,
      successRows: 0,
      failedRows: 0,
      errors: []
    };

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];
          
          result.totalRows = jsonData.length;
          
          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            try {
              const supplier = {
                code: `SUP${Date.now()}${i}`,
                name_ar: String(row['الاسم عربي'] || ''),
                name_en: row['الاسم إنجليزي'] ? String(row['الاسم إنجليزي']) : null,
                phone: row['الهاتف'] ? String(row['الهاتف']) : null,
                email: row['البريد الإلكتروني'] ? String(row['البريد الإلكتروني']) : null,
                address: row['العنوان'] ? String(row['العنوان']) : null,
                city: row['المدينة'] ? String(row['المدينة']) : null,
                opening_balance: Number(row['الرصيد الافتتاحي'] || 0),
                credit_limit: Number(row['حد الائتمان'] || 0),
                payment_terms: Number(row['شروط الدفع'] || 30),
                status: 'active' as const,
                current_balance: Number(row['الرصيد الافتتاحي'] || 0)
              };

              if (!supplier.name_ar) {
                throw new Error('الاسم العربي مطلوب');
              }

              const { error } = await supabase.from('suppliers').insert(supplier);
              if (error) throw error;
              
              result.successRows++;
            } catch (error) {
              result.failedRows++;
              result.errors.push(`صف ${i + 2}: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
            }
          }

          result.success = result.failedRows === 0;
          
          await supabase.from('import_logs').insert({
            import_type: 'suppliers',
            file_name: file.name,
            total_rows: result.totalRows,
            success_rows: result.successRows,
            failed_rows: result.failedRows,
            errors: { messages: result.errors },
            status: result.success ? 'completed' : 'partial'
          });

          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('فشل قراءة الملف'));
      reader.readAsArrayBuffer(file);
    });
  },

  async importProducts(file: File): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      totalRows: 0,
      successRows: 0,
      failedRows: 0,
      errors: []
    };

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];
          
          result.totalRows = jsonData.length;
          
          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            try {
              const { data: existing } = await supabase
                .from('products')
                .select('id')
                .eq('sku', String(row['SKU']))
                .single();

              if (existing) {
                await supabase
                  .from('products')
                  .update({
                    name_ar: String(row['الاسم عربي']),
                    name_en: row['الاسم إنجليزي'] ? String(row['الاسم إنجليزي']) : null,
                    barcode: row['الباركود'] ? String(row['الباركود']) : null,
                    unit: String(row['الوحدة'] || 'قطعة'),
                    cost_price: Number(row['سعر التكلفة'] || 0),
                    sale_price: Number(row['سعر البيع'] || 0),
                    current_stock: Number(row['الكمية'] || 0),
                    min_stock_level: Number(row['الحد الأدنى'] || 10)
                  })
                  .eq('id', existing.id);
              } else {
                const product = {
                  sku: String(row['SKU']),
                  barcode: row['الباركود'] ? String(row['الباركود']) : null,
                  name_ar: String(row['الاسم عربي']),
                  name_en: row['الاسم إنجليزي'] ? String(row['الاسم إنجليزي']) : null,
                  unit: String(row['الوحدة'] || 'قطعة'),
                  cost_price: Number(row['سعر التكلفة'] || 0),
                  sale_price: Number(row['سعر البيع'] || 0),
                  current_stock: Number(row['الكمية'] || 0),
                  min_stock_level: Number(row['الحد الأدنى'] || 10),
                  unit_price: Number(row['سعر البيع'] || 0),
                  is_active: true
                };

                const { error } = await supabase.from('products').insert(product);
                if (error) throw error;
              }
              
              result.successRows++;
            } catch (error) {
              result.failedRows++;
              result.errors.push(`صف ${i + 2}: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
            }
          }

          result.success = result.failedRows === 0;
          
          await supabase.from('import_logs').insert({
            import_type: 'products',
            file_name: file.name,
            total_rows: result.totalRows,
            success_rows: result.successRows,
            failed_rows: result.failedRows,
            errors: { messages: result.errors },
            status: result.success ? 'completed' : 'partial'
          });

          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('فشل قراءة الملف'));
      reader.readAsArrayBuffer(file);
    });
  }
};