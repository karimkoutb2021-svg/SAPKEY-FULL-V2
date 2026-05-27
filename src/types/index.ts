// ==============================
// USER ROLES & PERMISSIONS
// ==============================
export type UserRole =
  | 'admin'
  | 'manager'
  | 'accountant'
  | 'cashier'
  | 'warehouse'
  | 'sales'
  | 'delivery'
  | 'supplier'
  | 'customer'
  | 'purchase';

export type UserStatus = 'active' | 'inactive' | 'suspended';
export type AuthMethod = 'email' | 'google' | 'phone' | 'custom';

export type Permission =
  | 'products.view'
  | 'products.create'
  | 'products.edit'
  | 'products.delete'
  | 'inventory.view'
  | 'inventory.edit'
  | 'inventory.transfer'
  | 'orders.view'
  | 'orders.create'
  | 'orders.edit'
  | 'orders.cancel'
  | 'orders.assign_delivery'
  | 'customers.view'
  | 'customers.create'
  | 'customers.edit'
  | 'customers.delete'
  | 'suppliers.view'
  | 'suppliers.create'
  | 'suppliers.edit'
  | 'accounting.view'
  | 'accounting.create'
  | 'accounting.approve'
  | 'employees.view'
  | 'employees.create'
  | 'employees.edit'
  | 'employees.delete'
  | 'settings.view'
  | 'settings.edit'
  | 'analytics.view'
  | 'reports.view'
  | 'reports.export'
  | 'pos.access'
  | 'pos.discount'
  | 'pos.refund'
  | 'delivery.view'
  | 'delivery.assign'
  | 'delivery.update_status'
  | 'warehouse.view'
  | 'warehouse.edit'
  | 'invoices.view'
  | 'invoices.create'
  | 'invoices.cancel'
  | 'ai.access'
  | 'offers.view'
  | 'offers.create'
  | 'offers.edit'
  | 'offers.delete'
  | 'coupons.view'
  | 'coupons.create'
  | 'coupons.edit'
  | 'coupons.delete'
  | 'reviews.view'
  | 'wallet.view'
  | 'wallet.deposit'
  | 'wallet.withdraw'
  | 'wallet.transfer'
  | 'wallet.redeem'
  | 'addresses.view'
  | 'addresses.create'
  | 'addresses.edit'
  | 'wishlist.view'
  | 'wishlist.create'
  | 'wishlist.delete'
  | 'notifications.view'
  | 'profile.edit'
  | 'platform.view'
  | 'tenants.view'
  | 'tenants.create'
  | 'tenants.edit'
  | 'tenants.delete'
  | 'subscriptions.view'
  | 'subscriptions.edit'
  | 'feature_flags.view'
  | 'feature_flags.edit'
  | 'security.view'
  | 'security.edit'
  | 'audit.view'
  | 'platform_analytics.view'
  | 'api_monitoring.view'
  | 'deployment.view'
  | 'deployment.edit'
  | 'branding.view'
  | 'branding.edit'
  | 'wholesale.view';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  nameAr?: string;
  phone: string;
  role: UserRole;
  branchIds: string[];
  defaultBranchId: string;
  permissions: Permission[];
  authMethod: AuthMethod;
  avatar?: string;
  address?: string;
  status: UserStatus;
  lastLogin?: number;
  createdAt: number;
  updatedAt: number;
}

export interface RoleInfo {
  id: UserRole;
  label: string;
  labelAr: string;
  description: string;
  descriptionAr: string;
  level: number;
  color: string;
  icon: string;
}

export const ROLES: Record<UserRole, RoleInfo> = {
  admin: {
    id: 'admin',
    label: 'Developer',
    labelAr: 'مطور النظام',
    description: 'Full system access and technical control',
    descriptionAr: 'مطور النظام — تحكم تقني كامل',
    level: 100,
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    icon: 'Shield',
  },
  manager: {
    id: 'manager',
    label: 'Manager',
    labelAr: 'مدير',
    description: 'Branch/Store management',
    descriptionAr: 'إدارة الفرع أو المتجر',
    level: 80,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    icon: 'UserCog',
  },
  accountant: {
    id: 'accountant',
    label: 'Accountant',
    labelAr: 'محاسب',
    description: 'Financial and accounting access',
    descriptionAr: 'وصول مالي ومحاسبي',
    level: 70,
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    icon: 'Calculator',
  },
  cashier: {
    id: 'cashier',
    label: 'Cashier',
    labelAr: 'كاشير',
    description: 'POS and sales operations',
    descriptionAr: 'عمليات نقطة البيع والمبيعات',
    level: 50,
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    icon: 'ShoppingCart',
  },
  warehouse: {
    id: 'warehouse',
    label: 'Warehouse Employee',
    labelAr: 'أمين مخزن',
    description: 'Inventory and warehouse management',
    descriptionAr: 'إدارة المخزون والمخازن',
    level: 50,
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    icon: 'Package',
  },
  sales: {
    id: 'sales',
    label: 'Sales Employee',
    labelAr: 'موظف مبيعات',
    description: 'Sales and customer management',
    descriptionAr: 'إدارة المبيعات والعملاء',
    level: 50,
    color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
    icon: 'TrendingUp',
  },
  delivery: {
    id: 'delivery',
    label: 'Delivery Driver',
    labelAr: 'مندوب توصيل',
    description: 'Delivery and order tracking',
    descriptionAr: 'توصيل الطلبات وتتبعها',
    level: 40,
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    icon: 'Truck',
  },
  supplier: {
    id: 'supplier',
    label: 'Supplier',
    labelAr: 'مورد',
    description: 'Product supply and order management',
    descriptionAr: 'إدارة التوريد والطلبات',
    level: 30,
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    icon: 'Truck',
  },
  customer: {
    id: 'customer',
    label: 'Customer',
    labelAr: 'عميل',
    description: 'Online store and order placement',
    descriptionAr: 'المتجر الإلكتروني وطلب المنتجات',
    level: 10,
    color: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
    icon: 'User',
  },
  purchase: {
    id: 'purchase',
    label: 'Purchase Agent',
    labelAr: 'مندوب المشتريات',
    description: 'Product purchasing and supplier management',
    descriptionAr: 'إدارة المشتريات والموردين',
    level: 50,
    color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
    icon: 'ShoppingBag',
  },
};

// ==============================
// BRANCH & WAREHOUSE
// ==============================
export interface Branch {
  id: string;
  name: string;
  nameAr: string;
  address: string;
  phone: string;
  active: boolean;
  createdAt: number;
}

export interface Warehouse {
  id: string;
  name: string;
  nameAr: string;
  branchId: string;
  address: string;
  manager: string;
  active: boolean;
  createdAt: number;
}

// ==============================
// PRODUCTS & CATEGORIES
// ==============================
export interface Category {
  id: string;
  name: string;
  nameAr: string;
  description?: string;
  image?: string;
  parentId?: string;
  active: boolean;
  sortOrder: number;
  createdAt: number;
}

export interface Supplier {
  id: string;
  userId?: string;
  name: string;
  nameAr: string;
  phone: string;
  email: string;
  address: string;
  taxNumber: string;
  notes?: string;
  active: boolean;
  createdAt: number;
}

export interface Product {
  id: string;
  name: string;
  nameAr: string;
  description?: string;
  descriptionAr?: string;
  barcode: string;
  sku: string;
  categoryId: string;
  supplierId?: string;
  unit: string;
  price: number;
  costPrice: number;
  wholesalePrice?: number;
  taxRate: number;
  image?: string;
  images: string[];
  minStock: number;
  maxStock: number;
  active: boolean;
  hasExpiry: boolean;
  tags: string[];
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  nameAr: string;
  price: number;
  sku: string;
  barcode: string;
  stock: number;
}

// ==============================
// INVENTORY & STOCK
// ==============================
export interface Inventory {
  id: string;
  productId: string;
  warehouseId: string;
  branchId: string;
  quantity: number;
  reservedQuantity: number;
  minStock: number;
  maxStock: number;
  location?: string;
  updatedAt: number;
}

export interface StockMovement {
  id: string;
  productId: string;
  warehouseId: string;
  branchId: string;
  type: 'in' | 'out' | 'transfer' | 'adjustment' | 'return';
  quantity: number;
  reference: string;
  notes?: string;
  userId: string;
  createdAt: number;
}

export interface ExpiryRecord {
  id: string;
  productId: string;
  batchNo: string;
  quantity: number;
  manufactureDate: number;
  expiryDate: number;
  warehouseId: string;
  branchId: string;
  status: 'active' | 'expiring' | 'expired' | 'disposed';
  disposedAt?: number;
  createdAt: number;
}

// ==============================
// CUSTOMERS
// ==============================
export interface Customer {
  id: string;
  userId?: string;
  name: string;
  nameAr: string;
  phone: string;
  email?: string;
  address?: string;
  points: number;
  totalSpent: number;
  totalOrders: number;
  notes?: string;
  active: boolean;
  createdAt: number;
}

// ==============================
// ORDERS
// ==============================
export interface Order {
  id: string;
  orderNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  branchId: string;
  warehouseId?: string;
  items: OrderItem[];
  subtotal: number;
  taxTotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  paidAmount: number;
  changeAmount: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  type: OrderType;
  deliveryId?: string;
  deliveryStatus?: DeliveryStatus;
  notes?: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  productNameAr: string;
  quantity: number;
  unit: string;
  price: number;
  costPrice: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  total: number;
  barcode: string;
  image?: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled' | 'refunded';
export type PaymentMethod = 'cash' | 'card' | 'online' | 'wallet' | 'cod';
export type PaymentStatus = 'pending' | 'paid' | 'partial' | 'refunded';
export type OrderType = 'pos' | 'online' | 'phone' | 'whatsapp';
export type DeliveryStatus = 'pending' | 'assigned' | 'picked' | 'in_transit' | 'delivered' | 'failed';

// ==============================
// FINANCIAL
// ==============================
export interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  category: string;
  amount: number;
  description: string;
  descriptionAr: string;
  reference: string;
  paymentMethod: PaymentMethod;
  branchId: string;
  userId: string;
  date: number;
  createdAt: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId?: string;
  customerId?: string;
  customerName: string;
  customerTaxNumber?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  taxTotal: number;
  total: number;
  paidAmount: number;
  dueAmount: number;
  status: 'paid' | 'partial' | 'unpaid' | 'cancelled';
  type: 'sale' | 'purchase' | 'return';
  issueDate: number;
  dueDate?: number;
  notes?: string;
  branchId: string;
  userId: string;
  createdAt: number;
}

// ==============================
// DELIVERY
// ==============================
export interface Delivery {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  branchId: string;
  driverId?: string;
  driverName?: string;
  status: DeliveryStatus;
  assignedAt?: number;
  pickedAt?: number;
  deliveredAt?: number;
  estimatedTime?: number;
  notes?: string;
  createdAt: number;
}

// ==============================
// NOTIFICATIONS & ANALYTICS
// ==============================
export interface Notification {
  id: string;
  title: string;
  titleAr: string;
  message: string;
  messageAr: string;
  type: 'order' | 'inventory' | 'expiry' | 'payment' | 'system';
  read: boolean;
  userId?: string;
  role?: UserRole[];
  branchId?: string;
  link?: string;
  createdAt: number;
}

export interface AnalyticsEvent {
  id: string;
  event: string;
  data: Record<string, unknown>;
  userId?: string;
  branchId?: string;
  timestamp: number;
}

// ==============================
// SYSTEM SETTINGS
// ==============================
export interface SystemSettings {
  id: string;
  storeName: string;
  storeNameAr: string;
  storePhone: string;
  storeEmail: string;
  storeAddress: string;
  taxNumber: string;
  currency: string;
  currencyAr: string;
  currencySymbol: string;
  timezone: string;
  language: 'ar' | 'en';
  primaryColor: string;
  logo?: string;
  whatsappNumber: string;
  deliveryFee: number;
  freeDeliveryMinimum: number;
  taxRate: number;
  branches: Branch[];
  warehouses: Warehouse[];
}

// ==============================
// ECOMMERCE - OFFERS & COUPONS
// ==============================
export interface Offer {
  id: string;
  name: string;
  nameAr: string;
  description?: string;
  descriptionAr?: string;
  image?: string;
  type: 'percentage' | 'fixed' | 'buy_x_get_y' | 'free_shipping';
  discountValue: number;
  minPurchase?: number;
  maxDiscount?: number;
  productIds: string[];
  categoryIds: string[];
  usageLimit?: number;
  usedCount: number;
  startDate: number;
  endDate: number;
  active: boolean;
  createdAt: number;
}

export interface Coupon {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  type: 'percentage' | 'fixed';
  discountValue: number;
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  perUserLimit: number;
  userIds: string[];
  productIds: string[];
  categoryIds: string[];
  startDate: number;
  endDate: number;
  active: boolean;
  createdAt: number;
}

// ==============================
// ECOMMERCE - CART & CHECKOUT
// ==============================
export interface EcommerceCartItem {
  productId: string;
  name: string;
  nameAr: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  image?: string;
  unit: string;
  variantId?: string;
  variantName?: string;
  maxQuantity: number;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  street: string;
  district: string;
  city: string;
  region: string;
  building?: string;
  apartment?: string;
  notes?: string;
  coordinates?: { lat: number; lng: number };
}

export interface CheckoutData {
  items: EcommerceCartItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  couponDiscount: number;
  deliveryFee: number;
  taxAmount: number;
  total: number;
  paymentMethod: 'cod' | 'card' | 'online' | 'wallet';
  shippingAddress: ShippingAddress;
  notes?: string;
}

// ==============================
// ECOMMERCE - WISHLIST & REVIEWS
// ==============================
export interface WishlistItem {
  productId: string;
  addedAt: number;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  commentAr?: string;
  images?: string[];
  createdAt: number;
}

export interface ProductRating {
  average: number;
  count: number;
  distribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
}

// ==============================
// ECOMMERCE - SEARCH & RECOMMENDATIONS
// ==============================
export interface SearchResult {
  products: Product[];
  totalCount: number;
  suggestions: string[];
  categories: Category[];
}

export interface Recommendation {
  type: 'bestseller' | 'trending' | 'similar' | 'frequently_bought' | 'personalized' | 'new_arrivals';
  title: string;
  titleAr: string;
  products: Product[];
}
