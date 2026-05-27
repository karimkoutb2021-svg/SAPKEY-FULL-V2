// ============================================
// ERP SYSTEM TYPES - SUPABASE BACKEND
// ============================================

// ==============================
// ENUMS
// ==============================

export type SupplierStatus = 'active' | 'inactive' | 'blocked' | 'pending';
export type InvoiceStatus = 'draft' | 'pending' | 'approved' | 'paid' | 'cancelled' | 'overdue';
export type PaymentType = 'cash' | 'card' | 'transfer' | 'partial';
export type PaymentScheduleStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';
export type NotificationType = string;
export type MovementType = 'purchase' | 'sale' | 'return' | 'adjustment' | 'transfer';
export type InvoiceImportance = 'low' | 'medium' | 'high' | 'urgent';
export type UserRole = 'admin' | 'manager' | 'accountant' | 'cashier';

// ==============================
// USERS & AUTHENTICATION
// ==============================

export interface ERPUser {
  id: string;
  email: string;
  full_name_ar: string;
  full_name_en: string | null;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  avatar_url: string | null;
  branch_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  token: string;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: string;
  created_at: string;
}

// ==============================
// PERMISSIONS
// ==============================

export interface Permission {
  id: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  module: string;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role: UserRole;
  permission_id: string;
  created_at: string;
}

// ==============================
// BRANCHES & WAREHOUSES
// ==============================

export interface Branch {
  id: string;
  name_ar: string;
  name_en: string | null;
  code: string;
  address: string | null;
  phone: string | null;
  is_main: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Warehouse {
  id: string;
  name_ar: string;
  name_en: string | null;
  code: string;
  address: string | null;
  is_main: boolean;
  is_active: boolean;
  created_at: string;
}

// ==============================
// SUPPLIERS
// ==============================

export interface Supplier {
  id: string;
  code: string;
  name_ar: string;
  name_en: string | null;
  category_id: string | null;
  contact_person: string | null;
  phone: string | null;
  phone_2: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  tax_number: string | null;
  commercial_registration: string | null;
  bank_name: string | null;
  bank_account: string | null;
  iban: string | null;
  opening_balance: number;
  current_balance: number;
  credit_limit: number;
  payment_terms: number;
  status: SupplierStatus;
  notes: string | null;
  rating: number;
  tags: string[] | null;
  attachment_urls: string[] | null;
  created_by: string | null;
  branch_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierCategory {
  id: string;
  name_ar: string;
  name_en: string | null;
  code: string;
  description: string | null;
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface SupplierContact {
  id: string;
  supplier_id: string;
  name: string;
  position: string | null;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
  notes: string | null;
  created_at: string;
}

export interface SupplierDocument {
  id: string;
  supplier_id: string;
  type: string;
  title: string | null;
  file_url: string;
  file_name: string | null;
  file_size: number | null;
  expiry_date: string | null;
  created_by: string | null;
  created_at: string;
}

export interface SupplierNote {
  id: string;
  supplier_id: string;
  content: string;
  is_important: boolean;
  created_by: string | null;
  created_at: string;
}

export interface SupplierAccountStatement {
  id: string;
  supplier_id: string;
  from_date: string;
  to_date: string;
  opening_balance: number;
  total_debit: number;
  total_credit: number;
  closing_balance: number;
  generated_by: string | null;
  generated_at: string;
}

// ==============================
// PURCHASE INVOICES
// ==============================

export interface PurchaseInvoice {
  id: string;
  invoice_number: string;
  supplier_id: string | null;
  supplier_code: string | null;
  supplier_name_ar: string | null;
  invoice_date: string;
  due_date: string | null;
  status: InvoiceStatus;
  importance: InvoiceImportance;
  subtotal: number;
  discount_amount: number;
  discount_percent: number;
  tax_amount: number;
  tax_percent: number;
  total: number;
  paid_amount: number;
  remaining_amount: number;
  notes: string | null;
  attachment_urls: string[] | null;
  ocr_data: Record<string, unknown> | null;
  original_file_url: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_by: string | null;
  branch_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseInvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string | null;
  product_code: string | null;
  product_name_ar: string | null;
  product_name_en: string | null;
  barcode: string | null;
  supplier_product_code: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  tax_percent: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  created_at: string;
}

// ==============================
// PAYMENTS
// ==============================

export interface PaymentSchedule {
  id: string;
  invoice_id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  paid_amount: number;
  status: PaymentScheduleStatus;
  paid_at: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  payment_number: string;
  supplier_id: string | null;
  invoice_id: string | null;
  amount: number;
  payment_type: PaymentType;
  payment_date: string;
  reference_number: string | null;
  bank_name: string | null;
  check_number: string | null;
  notes: string | null;
  attachment_url: string | null;
  created_by: string | null;
  branch_id: string | null;
  created_at: string;
}

// ==============================
// PRODUCTS & INVENTORY
// ==============================

export interface Product {
  id: string;
  sku: string;
  barcode: string | null;
  name_ar: string;
  name_en: string | null;
  category_id: string | null;
  unit: string;
  unit_price: number;
  cost_price: number;
  sale_price: number;
  min_stock_level: number;
  current_stock: number;
  is_active: boolean;
  image_url: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductSupplier {
  id: string;
  product_id: string;
  supplier_id: string;
  supplier_product_code: string | null;
  supplier_product_name: string | null;
  unit_price: number | null;
  is_preferred: boolean;
  created_at: string;
}

export interface InventoryStock {
  id: string;
  product_id: string;
  warehouse_id: string;
  quantity: number;
  reserved_quantity: number;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  warehouse_id: string;
  movement_type: MovementType;
  quantity: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

// ==============================
// NOTIFICATIONS
// ==============================

export interface ERPNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  user_id: string | null;
  supplier_id: string | null;
  invoice_id: string | null;
  is_read: boolean;
  read_at: string | null;
  action_url: string | null;
  requires_approval: boolean;
  approved: boolean | null;
  approved_at: string | null;
  approved_by: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

// ==============================
// ACCOUNTING
// ==============================

export interface JournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  reference_type: string | null;
  reference_id: string | null;
  total_debit: number;
  total_credit: number;
  is_posted: boolean;
  posted_by: string | null;
  posted_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface JournalLine {
  id: string;
  entry_id: string;
  account_code: string;
  account_name_ar: string;
  debit: number;
  credit: number;
  description: string | null;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
}

export interface ChartOfAccount {
  id: string;
  code: string;
  name_ar: string;
  name_en: string | null;
  account_type: string;
  parent_code: string | null;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
}

export interface SupplierLedger {
  id: string;
  supplier_id: string | null;
  entry_date: string;
  description: string;
  reference_type: string | null;
  reference_id: string | null;
  debit: number;
  credit: number;
  balance: number;
  created_at: string;
}

// ==============================
// IMPORT/EXPORT
// ==============================

export interface ImportLog {
  id: string;
  import_type: string;
  file_name: string;
  total_rows: number;
  success_rows: number;
  failed_rows: number;
  errors: Record<string, unknown> | null;
  status: string;
  created_by: string | null;
  created_at: string;
}

// ==============================
// AUDIT
// ==============================

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ==============================
// COMBINED TYPES FOR UI
// ==============================

export interface SupplierWithCategory extends Supplier {
  category?: SupplierCategory;
}

export interface InvoiceWithSupplier extends PurchaseInvoice {
  supplier?: Supplier;
  items?: PurchaseInvoiceItem[];
}

export interface PaymentWithDetails extends Payment {
  supplier?: Supplier;
  invoice?: PurchaseInvoice;
}

export interface DashboardStats {
  totalSuppliers: number;
  activeSuppliers: number;
  totalInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  totalPurchases: number;
  totalPaid: number;
  totalDue: number;
  lowStockProducts: number;
}

export interface SupplierAnalytics {
  supplierId: string;
  supplierName: string;
  totalPurchases: number;
  totalPayments: number;
  currentBalance: number;
  invoiceCount: number;
  lastPurchaseDate: string | null;
}

// ==============================
// FORM TYPES
// ==============================

export interface SupplierFormData {
  code: string;
  name_ar: string;
  name_en?: string;
  category_id?: string;
  contact_person?: string;
  phone?: string;
  phone_2?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  tax_number?: string;
  commercial_registration?: string;
  bank_name?: string;
  bank_account?: string;
  iban?: string;
  opening_balance?: number;
  credit_limit?: number;
  payment_terms?: number;
  notes?: string;
  tags?: string[];
}

export interface InvoiceFormData {
  supplier_id?: string;
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  importance?: InvoiceImportance;
  notes?: string;
  items: InvoiceItemFormData[];
  discount_percent?: number;
  discount_amount?: number;
  tax_percent?: number;
}

export interface InvoiceItemFormData {
  product_id?: string;
  product_code?: string;
  product_name_ar?: string;
  barcode?: string;
  supplier_product_code?: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  discount_percent?: number;
  tax_percent?: number;
  notes?: string;
}

export interface PaymentFormData {
  supplier_id: string;
  invoice_id?: string;
  amount: number;
  payment_type: PaymentType;
  payment_date: string;
  reference_number?: string;
  bank_name?: string;
  check_number?: string;
  notes?: string;
}

// ==============================
// OCR TYPES
// ==============================

export interface OCRResult {
  supplier_name?: string;
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  items: OCRItem[];
  subtotal?: number;
  tax?: number;
  total?: number;
}

export interface OCRItem {
  name?: string;
  quantity?: number;
  unit_price?: number;
  total?: number;
}

// ==============================
// ROLE PERMISSIONS MAP
// ==============================

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: [
    'suppliers.view', 'suppliers.create', 'suppliers.edit', 'suppliers.delete',
    'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.approve', 'invoices.delete',
    'payments.view', 'payments.create', 'payments.approve',
    'reports.view', 'reports.export',
    'inventory.view', 'inventory.adjust',
    'users.manage', 'settings.manage',
    'ocr.scan', 'excel.import', 'excel.export'
  ],
  manager: [
    'suppliers.view', 'suppliers.create', 'suppliers.edit',
    'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.approve',
    'payments.view', 'payments.create', 'payments.approve',
    'reports.view', 'reports.export',
    'inventory.view', 'inventory.adjust',
    'ocr.scan', 'excel.import', 'excel.export'
  ],
  accountant: [
    'suppliers.view', 'suppliers.create', 'suppliers.edit',
    'invoices.view', 'invoices.create', 'invoices.edit',
    'payments.view', 'payments.create', 'payments.approve',
    'reports.view', 'reports.export'
  ],
  cashier: [
    'suppliers.view',
    'invoices.view', 'invoices.create',
    'payments.view', 'payments.create'
  ]
};

// ==============================
// STATUS COLORS & LABELS
// ==============================

export const SUPPLIER_STATUS_COLORS: Record<SupplierStatus, { bg: string; text: string }> = {
  active: { bg: 'bg-green-100', text: 'text-green-800' },
  inactive: { bg: 'bg-gray-100', text: 'text-gray-800' },
  blocked: { bg: 'bg-red-100', text: 'text-red-800' },
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' }
};

export const SUPPLIER_STATUS_LABELS: Record<SupplierStatus, string> = {
  active: 'نشط',
  inactive: 'غير نشط',
  blocked: 'محظور',
  pending: 'معلق'
};

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, { bg: string; text: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-800' },
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  approved: { bg: 'bg-blue-100', text: 'text-blue-800' },
  paid: { bg: 'bg-green-100', text: 'text-green-800' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-800' },
  overdue: { bg: 'bg-orange-100', text: 'text-orange-800' }
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'مسودة',
  pending: 'معلق',
  approved: 'معتمد',
  paid: 'مدفوع',
  cancelled: 'ملغي',
  overdue: 'متأخر'
};

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  cash: 'نقدي',
  card: 'بطاقة',
  transfer: 'تحويل',
  partial: 'جزئي'
};

export interface ProductNotificationThreshold {
  id: string;
  product_id: string;
  warehouse_id: string | null;
  custom_min_stock: number;
  expiry_alert_days: number | null;
  created_at: string;
  updated_at: string;
  products?: { name_ar: string; sku: string };
  warehouses?: { name_ar: string };
}

export interface CashThresholdConfig {
  id: string;
  branch_id: string | null;
  safe_limit: number;
  enabled: boolean;
  notify_manager: boolean;
  created_at: string;
  updated_at: string;
}