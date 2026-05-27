import type { UserRole, Permission } from '@/types';

type PermissionMap = Record<UserRole, Permission[]>;

const DEFAULT_PERMISSIONS: PermissionMap = {
  admin: [
    'platform.view',
    'tenants.view', 'tenants.create', 'tenants.edit', 'tenants.delete',
    'subscriptions.view', 'subscriptions.edit',
    'feature_flags.view', 'feature_flags.edit',
    'security.view', 'security.edit',
    'audit.view',
    'platform_analytics.view',
    'api_monitoring.view',
    'deployment.view', 'deployment.edit',
    'branding.view', 'branding.edit',
    'settings.view', 'settings.edit',
    'ai.access',
    'reports.view', 'reports.export',
  ],
  manager: [
    'products.view', 'products.create', 'products.edit', 'products.delete',
    'inventory.view', 'inventory.edit', 'inventory.transfer',
    'orders.view', 'orders.create', 'orders.edit', 'orders.cancel', 'orders.assign_delivery',
    'customers.view', 'customers.create', 'customers.edit', 'customers.delete',
    'suppliers.view', 'suppliers.create', 'suppliers.edit',
    'accounting.view', 'accounting.create', 'accounting.approve',
    'employees.view', 'employees.create', 'employees.edit', 'employees.delete',
    'settings.view', 'settings.edit',
    'analytics.view',
    'reports.view', 'reports.export',
    'pos.access', 'pos.discount', 'pos.refund',
    'delivery.view', 'delivery.assign', 'delivery.update_status',
    'warehouse.view', 'warehouse.edit',
    'invoices.view', 'invoices.create', 'invoices.cancel',
    'ai.access',
    'offers.view', 'offers.create', 'offers.edit', 'offers.delete',
    'coupons.view', 'coupons.create', 'coupons.edit', 'coupons.delete',
    'reviews.view',
    'wallet.view', 'wallet.deposit', 'wallet.withdraw', 'wallet.transfer',
    'wholesale.view',
  ],
  accountant: [
    'products.view',
    'inventory.view',
    'orders.view',
    'customers.view',
    'suppliers.view',
    'accounting.view', 'accounting.create',
    'reports.view', 'reports.export',
    'invoices.view', 'invoices.create',
    'analytics.view',
  ],
  cashier: [
    'products.view',
    'inventory.view',
    'orders.view', 'orders.create',
    'customers.view', 'customers.create',
    'pos.access',
    'invoices.view',
    'ai.access',
    'wallet.view',
  ],
  warehouse: [
    'products.view', 'products.create',
    'inventory.view', 'inventory.edit', 'inventory.transfer',
    'orders.view',
    'suppliers.view',
    'warehouse.view', 'warehouse.edit',
  ],
  sales: [
    'products.view',
    'inventory.view',
    'orders.view', 'orders.create',
    'customers.view', 'customers.create', 'customers.edit',
    'pos.access',
    'ai.access',
  ],
  delivery: [
    'orders.view',
    'delivery.view', 'delivery.update_status',
  ],
  supplier: [
    'products.view',
    'orders.view',
    'suppliers.view',
  ],
  customer: [
    'products.view',
    'orders.view', 'orders.create', 'orders.cancel',
    'customers.view',
    'wallet.view', 'wallet.deposit', 'wallet.redeem',
    'addresses.view', 'addresses.create', 'addresses.edit',
    'wishlist.view', 'wishlist.create', 'wishlist.delete',
    'notifications.view',
    'profile.edit',
  ],
  purchase: [
    'products.view',
    'inventory.view',
    'orders.view', 'orders.create',
    'suppliers.view', 'suppliers.create', 'suppliers.edit',
    'accounting.view', 'accounting.create',
    'invoices.view', 'invoices.create',
    'reports.view',
  ],
};

export function getDefaultPermissions(role: UserRole): Permission[] {
  return DEFAULT_PERMISSIONS[role] ?? [];
}

export function hasPermission(
  userPermissions: Permission[] | undefined,
  requiredPermission: Permission
): boolean {
  return userPermissions?.includes(requiredPermission) ?? false;
}

export function hasAnyPermission(
  userPermissions: Permission[] | undefined,
  requiredPermissions: Permission[]
): boolean {
  return requiredPermissions.some((p) => hasPermission(userPermissions, p));
}

export function hasAllPermissions(
  userPermissions: Permission[] | undefined,
  requiredPermissions: Permission[]
): boolean {
  return requiredPermissions.every((p) => hasPermission(userPermissions, p));
}

export function canUser(
  role: UserRole,
  action: Permission
): boolean {
  return DEFAULT_PERMISSIONS[role]?.includes(action) ?? false;
}

interface NavItem {
  title: string;
  titleAr: string;
  href: string;
  icon: string;
  roles: UserRole[];
  permissions?: Permission[];
}

export const NAV_ITEMS: NavItem[] = [
  // --- Platform Nav (admin only) ---
  { title: 'Dashboard', titleAr: 'لوحة المطور', href: '/admin', icon: 'Shield', roles: ['admin'], permissions: ['platform.view'] },
  { title: 'Tenants', titleAr: 'المستأجرين', href: '/admin/tenants', icon: 'Building2', roles: ['admin'], permissions: ['tenants.view'] },
  { title: 'Subscriptions', titleAr: 'الباقات', href: '/admin/subscriptions', icon: 'CreditCard', roles: ['admin'], permissions: ['subscriptions.view'] },
  { title: 'Feature Flags', titleAr: 'الميزات', href: '/admin/feature-flags', icon: 'ToggleLeft', roles: ['admin'], permissions: ['feature_flags.view'] },
  { title: 'Security', titleAr: 'الأمان', href: '/admin/security', icon: 'Shield', roles: ['admin'], permissions: ['security.view'] },
  { title: 'Audit Logs', titleAr: 'سجل المراجعة', href: '/admin/audit-logs', icon: 'ScrollText', roles: ['admin'], permissions: ['audit.view'] },
  { title: 'Platform Analytics', titleAr: 'تحليلات المنصة', href: '/admin/platform-analytics', icon: 'BarChart3', roles: ['admin'], permissions: ['platform_analytics.view'] },
  { title: 'API Monitoring', titleAr: 'مراقبة API', href: '/admin/api-monitoring', icon: 'Activity', roles: ['admin'], permissions: ['api_monitoring.view'] },
  { title: 'Deployment', titleAr: 'النشر', href: '/admin/deployment', icon: 'Rocket', roles: ['admin'], permissions: ['deployment.view'] },
  { title: 'Branding', titleAr: 'العلامة التجارية', href: '/admin/branding', icon: 'Palette', roles: ['admin'], permissions: ['branding.view'] },
  { title: 'Developer Profile', titleAr: 'الملف الشخصي', href: '/admin/developer-profile', icon: 'User', roles: ['admin'], permissions: ['settings.view'] },
  { title: 'Users', titleAr: 'المستخدمين', href: '/admin/users', icon: 'Users', roles: ['admin'], permissions: ['platform.view'] },
  { title: 'Guides', titleAr: 'الأدلة', href: '/admin/guides', icon: 'BookOpen', roles: ['admin'], permissions: ['settings.edit'] },
  { title: 'System Health', titleAr: 'صحة النظام', href: '/admin/system-health', icon: 'HeartPulse', roles: ['admin'], permissions: ['platform.view'] },
  { title: 'Backup', titleAr: 'التقارير والنسخ الاحتياطي', href: '/admin/backup', icon: 'Database', roles: ['admin'], permissions: ['reports.view'] },

  // --- Supermarket Nav (NO admin role) ---
  { title: 'Dashboard', titleAr: 'لوحة التحكم', href: '/dashboard', icon: 'LayoutDashboard', roles: ['manager', 'accountant', 'sales', 'warehouse', 'purchase'] },
  { title: 'POS', titleAr: 'نقطة البيع', href: '/pos', icon: 'ShoppingCart', roles: ['manager', 'cashier', 'sales'], permissions: ['pos.access'] },
  { title: 'Products', titleAr: 'المنتجات', href: '/products', icon: 'Package', roles: ['manager', 'warehouse', 'sales', 'supplier', 'purchase'], permissions: ['products.view'] },
  { title: 'Inventory', titleAr: 'المخزون', href: '/inventory', icon: 'Boxes', roles: ['manager', 'warehouse', 'accountant', 'purchase'], permissions: ['inventory.view'] },
  { title: 'Orders', titleAr: 'الطلبات', href: '/orders', icon: 'ScrollText', roles: ['manager', 'cashier', 'delivery', 'warehouse', 'sales', 'supplier', 'customer', 'purchase'], permissions: ['orders.view'] },
  { title: 'Customers', titleAr: 'العملاء', href: '/customers', icon: 'Users', roles: ['manager', 'cashier', 'sales'], permissions: ['customers.view'] },
  { title: 'Purchase Orders', titleAr: 'طلبات التوريد', href: '/purchase-orders', icon: 'ShoppingCart', roles: ['manager', 'warehouse', 'accountant', 'purchase'], permissions: ['suppliers.view'] },
  { title: 'Suppliers', titleAr: 'الموردين', href: '/suppliers', icon: 'Truck', roles: ['manager', 'warehouse', 'accountant', 'supplier', 'purchase'], permissions: ['suppliers.view'] },
  { title: 'Warehouses', titleAr: 'المستودعات', href: '/warehouse', icon: 'Warehouse', roles: ['manager', 'warehouse'], permissions: ['warehouse.view'] },
  { title: 'Accounting', titleAr: 'المحاسبة', href: '/accounting', icon: 'Calculator', roles: ['manager', 'accountant', 'purchase'], permissions: ['accounting.view'] },
  { title: 'Delivery', titleAr: 'التوصيل', href: '/delivery', icon: 'Truck', roles: ['manager', 'delivery'], permissions: ['delivery.view'] },
  { title: 'Analytics', titleAr: 'التحليلات', href: '/analytics', icon: 'BarChart3', roles: ['manager', 'accountant'], permissions: ['analytics.view'] },
  { title: 'Employees', titleAr: 'الموظفين', href: '/employees', icon: 'UserCog', roles: ['manager'], permissions: ['employees.view'] },
  { title: 'Invoices', titleAr: 'الفواتير', href: '/invoices', icon: 'FileText', roles: ['manager', 'accountant', 'cashier'], permissions: ['invoices.view'] },
  { title: 'Offers', titleAr: 'العروض', href: '/offers', icon: 'Tags', roles: ['manager'], permissions: ['offers.view'] },
  { title: 'Coupons', titleAr: 'الكوبونات', href: '/coupons', icon: 'Percent', roles: ['manager'], permissions: ['coupons.view'] },
  { title: 'Shop', titleAr: 'المتجر', href: '/shop', icon: 'Store', roles: ['manager', 'cashier', 'sales', 'customer'] },
  { title: 'AI Assistant', titleAr: 'المساعد الذكي', href: '/ai-assistant', icon: 'Headphones', roles: ['admin', 'manager', 'cashier', 'sales'], permissions: ['ai.access'] },
  { title: 'AI Voice Ordering', titleAr: 'الطلب الصوتي', href: '/ai-ordering', icon: 'Mic', roles: ['manager', 'cashier', 'sales'], permissions: ['ai.access'] },
  { title: 'My Store', titleAr: 'متجري', href: '/customer', icon: 'Store', roles: ['customer'] },
  { title: 'Addresses', titleAr: 'العناوين', href: '/customer/addresses', icon: 'MapPin', roles: ['customer'], permissions: ['addresses.view'] },
  { title: 'Wishlist', titleAr: 'المفضلة', href: '/customer/wishlist', icon: 'Heart', roles: ['customer'], permissions: ['wishlist.view'] },
  { title: 'Supplier Portal', titleAr: 'بوابة المورد', href: '/supplier-dashboard', icon: 'Truck', roles: ['supplier'] },
  { title: 'Wallet', titleAr: 'المحافظ', href: '/wallet', icon: 'Wallet', roles: ['manager', 'cashier'], permissions: ['wallet.view'] },
  { title: 'WhatsApp', titleAr: 'واتساب', href: '/whatsapp', icon: 'MessageCircle', roles: ['manager'], permissions: ['settings.view'] },
  { title: 'Wholesale', titleAr: 'الجملة والحسابات', href: '/wholesale', icon: 'TrendingUp', roles: ['manager'], permissions: ['wholesale.view'] },
  { title: 'Backup', titleAr: 'التقارير والنسخ الاحتياطي', href: '/backup', icon: 'Database', roles: ['manager'], permissions: ['reports.view'] },
  { title: 'Settings', titleAr: 'الإعدادات', href: '/settings', icon: 'Settings', roles: ['manager'], permissions: ['settings.view'] },
];

export function getNavItemsForRole(role: UserRole, userPermissions?: Permission[]): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (!item.roles.includes(role)) return false;
    if (item.permissions && userPermissions) {
      return hasAnyPermission(userPermissions, item.permissions);
    }
    return true;
  });
}

export function getDefaultRouteForRole(role: UserRole): string {
  const routeMap: Record<UserRole, string> = {
    admin: '/admin',
    manager: '/dashboard',
    accountant: '/accounting',
    cashier: '/pos',
    warehouse: '/inventory',
    sales: '/pos',
    delivery: '/delivery',
    supplier: '/supplier-dashboard',
    customer: '/shop',
    purchase: '/purchase-orders',
  };
  return routeMap[role] ?? '/dashboard';
}
