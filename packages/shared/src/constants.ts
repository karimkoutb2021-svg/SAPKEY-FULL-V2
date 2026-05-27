export const APP_NAME = 'SuperMarket ERP';
export const APP_NAME_AR = 'نظام إدارة السوبر ماركت';
export const APP_VERSION = '2.0.0';

export const DEFAULT_CURRENCY = 'EGP';
export const DEFAULT_CURRENCY_SYMBOL = 'ج.م';
export const DEFAULT_TAX_RATE = 14;
export const DEFAULT_LANGUAGE = 'ar';
export const DEFAULT_TIMEZONE = 'Africa/Cairo';

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
};

export const STOCK = {
  LOW_STOCK_THRESHOLD: 10,
  EXPIRY_WARNING_DAYS: 7,
  MAX_OVERSTOCK_PERCENTAGE: 150,
};

export const DELIVERY = {
  DEFAULT_FEE: 15,
  FREE_DELIVERY_MINIMUM: 100,
  MAX_DISTANCE_KM: 50,
};

export const FILE_SIZE_LIMITS = {
  PRODUCT_IMAGE: 5 * 1024 * 1024, // 5MB
  AVATAR: 2 * 1024 * 1024, // 2MB
  INVOICE_PDF: 10 * 1024 * 1024, // 10MB
};

export const CACHE_KEYS = {
  USER_PROFILE: 'user_profile',
  BRANCHES: 'branches',
  CATEGORIES: 'categories',
  CART: 'ecommerce_cart',
  WISHLIST: 'ecommerce_wishlist',
  POS_CART: 'pos_cart',
};
