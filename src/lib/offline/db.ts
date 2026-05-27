/**
 * ═══════════════════════════════════════════════════════════
 *  قاعدة بيانات محلية - تعمل بدون إنترنت
 *  IndexedDB Offline Cache & Sales Buffer
 * ═══════════════════════════════════════════════════════════
 * 
 * تخزن المنتجات محلياً في IndexedDB للبحث الفوري بدون إنترنت
 * وتخزن المبيعات المؤقتة لمزامنتها لاحقاً مع Supabase
 */

// ═══════════════════════════════════════════════════════════
// تعريف الأنواع
// ═══════════════════════════════════════════════════════════

export interface LocalProduct {
  id: string;
  sku: string;
  barcode: string | null;
  nameAr: string;
  nameEn: string | null;
  price: number;
  costPrice: number;
  categoryId: string | null;
  unit: string;
  stock: number;
  isActive: boolean;
}

export interface OfflineSale {
  id: string;
  orderNumber: string;
  items: Array<{
    productId: string;
    name: string;
    nameAr: string;
    price: number;
    quantity: number;
    barcode: string;
    unit: string;
    taxRate: number;
    itemDiscount: number;
    total: number;
  }>;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  paymentMethod: string;
  cashierId: string;
  cashierName: string;
  shiftId: string | null;
  createdAt: string;
  synced: boolean;
  paymentDetails?: any;
}

// ═══════════════════════════════════════════════════════════
// إعداد قاعدة البيانات IndexedDB
// ═══════════════════════════════════════════════════════════

const DB_NAME = 'pos_offline_db';
const DB_VERSION = 2;
const PRODUCTS_STORE = 'products';
const SALES_STORE = 'sales';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // مخزن المنتجات - فهارس للبحث السريع
      if (!db.objectStoreNames.contains(PRODUCTS_STORE)) {
        const productStore = db.createObjectStore(PRODUCTS_STORE, { keyPath: 'id' });
        productStore.createIndex('barcode', 'barcode', { unique: false });
        productStore.createIndex('sku', 'sku', { unique: false });
        productStore.createIndex('nameAr', 'nameAr', { unique: false });
        productStore.createIndex('categoryId', 'categoryId', { unique: false });
      }

      // مخزن المبيعات المؤقتة
      if (!db.objectStoreNames.contains(SALES_STORE)) {
        const salesStore = db.createObjectStore(SALES_STORE, { keyPath: 'id' });
        salesStore.createIndex('orderNumber', 'orderNumber', { unique: true });
        salesStore.createIndex('synced', 'synced', { unique: false });
        salesStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

// ═══════════════════════════════════════════════════════════
// دوال المنتجات - Products Cache
// ═══════════════════════════════════════════════════════════

/**
 * حفظ/تحديث المنتجات في قاعدة البيانات المحلية
 * Save/update products in local IndexedDB cache
 */
export async function cacheProducts(products: LocalProduct[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(PRODUCTS_STORE, 'readwrite');
  const store = tx.objectStore(PRODUCTS_STORE);

  // مسح المنتجات القديمة أولاً
  store.clear();

  // إضافة المنتجات الجديدة
  for (const product of products) {
    store.put(product);
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * البحث عن منتج بالباركود - بحث فوري بدون إنترنت
 * Find product by barcode - instant offline search
 */
export async function findProductByBarcode(barcode: string): Promise<LocalProduct | null> {
  const db = await openDB();
  const tx = db.transaction(PRODUCTS_STORE, 'readonly');
  const store = tx.objectStore(PRODUCTS_STORE);
  const index = store.index('barcode');

  return new Promise((resolve, reject) => {
    const request = index.get(barcode);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * البحث عن منتج بالـ SKU
 * Find product by SKU
 */
export async function findProductBySku(sku: string): Promise<LocalProduct | null> {
  const db = await openDB();
  const tx = db.transaction(PRODUCTS_STORE, 'readonly');
  const store = tx.objectStore(PRODUCTS_STORE);
  const index = store.index('sku');

  return new Promise((resolve, reject) => {
    const request = index.get(sku);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * جلب جميع المنتجات المخزنة محلياً
 * Get all locally cached products
 */
export async function getAllCachedProducts(): Promise<LocalProduct[]> {
  const db = await openDB();
  const tx = db.transaction(PRODUCTS_STORE, 'readonly');
  const store = tx.objectStore(PRODUCTS_STORE);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * عدد المنتجات المخزنة محلياً
 * Count of locally cached products
 */
export async function getCachedProductsCount(): Promise<number> {
  const db = await openDB();
  const tx = db.transaction(PRODUCTS_STORE, 'readonly');
  const store = tx.objectStore(PRODUCTS_STORE);

  return new Promise((resolve, reject) => {
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ═══════════════════════════════════════════════════════════
// دوال المبيعات المؤقتة - Offline Sales Buffer
// ═══════════════════════════════════════════════════════════

/**
 * إضافة عملية بيع مؤقتة - تعمل بدون إنترنت
 * Add an offline sale to the local buffer
 */
export async function addOfflineSale(sale: OfflineSale): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(SALES_STORE, 'readwrite');
  const store = tx.objectStore(SALES_STORE);
  store.put(sale);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * جلب جميع المبيعات غير المزامنة
 * Get all unsynced offline sales
 */
export async function getUnsyncedSales(): Promise<OfflineSale[]> {
  const db = await openDB();
  const tx = db.transaction(SALES_STORE, 'readonly');
  const store = tx.objectStore(SALES_STORE);
  const index = store.index('synced');

  return new Promise((resolve, reject) => {
    const request = index.getAll(IDBKeyRange.only(false));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * جلب جميع المبيعات المخزنة
 * Get all stored sales (synced + unsynced)
 */
export async function getAllOfflineSales(): Promise<OfflineSale[]> {
  const db = await openDB();
  const tx = db.transaction(SALES_STORE, 'readonly');
  const store = tx.objectStore(SALES_STORE);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * تحديث حالة المزامنة لعملية بيع
 * Update sync status for a sale
 */
export async function markSaleAsSynced(saleId: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(SALES_STORE, 'readwrite');
  const store = tx.objectStore(SALES_STORE);

  return new Promise((resolve, reject) => {
    const getRequest = store.get(saleId);
    getRequest.onsuccess = () => {
      const sale = getRequest.result;
      if (sale) {
        sale.synced = true;
        store.put(sale);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * حذف المبيعات المزامنة من قاعدة البيانات المحلية
 * Delete synced sales from local DB to free space
 */
export async function clearSyncedSales(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(SALES_STORE, 'readwrite');
  const store = tx.objectStore(SALES_STORE);
  const index = store.index('synced');

  return new Promise((resolve, reject) => {
    const request = index.getAll(IDBKeyRange.only(true));
    request.onsuccess = () => {
      for (const sale of request.result) {
        store.delete(sale.id);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * عدد المبيعات غير المزامنة
 * Count of unsynced sales
 */
export async function getUnsyncedSalesCount(): Promise<number> {
  const db = await openDB();
  const tx = db.transaction(SALES_STORE, 'readonly');
  const store = tx.objectStore(SALES_STORE);
  const index = store.index('synced');

  return new Promise((resolve, reject) => {
    const request = index.count(IDBKeyRange.only(false));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ═══════════════════════════════════════════════════════════
// مزامنة المبيعات مع Supabase - Manager Sync
// ═══════════════════════════════════════════════════════════

/**
 * مزامنة جميع المبيعات المؤقتة مع Supabase
 * يتم استدعاؤها بواسطة المدير عند الاتصال بالواي فاي
 * Sync all offline sales with Supabase - called by manager on WiFi
 */
export async function syncOfflineSalesToSupabase(
  supabase: any,
  onProgress?: (current: number, total: number, sale: OfflineSale) => void
): Promise<{ success: number; failed: number; errors: string[] }> {
  const result = { success: 0, failed: 0, errors: [] as string[] };

  try {
    // جلب المبيعات غير المزامنة
    const unsyncedSales = await getUnsyncedSales();

    if (unsyncedSales.length === 0) {
      return result;
    }

    const total = unsyncedSales.length;

    // تحويل المبيعات إلى صيغة Supabase
    const ordersToInsert = unsyncedSales.map(sale => ({
      order_number: sale.orderNumber,
      customer_id: null,
      subtotal: sale.subtotal,
      tax_total: sale.taxTotal,
      discount_total: sale.discountTotal,
      grand_total: sale.grandTotal,
      payment_method: sale.paymentMethod,
      status: 'completed',
      cashier_id: sale.cashierId,
      cashier_name: sale.cashierName,
      shift_id: sale.shiftId,
      is_offline: true,
      created_at: sale.createdAt,
    }));

    // إرسال دفعة واحدة (Bulk Insert)
    const { data: insertedOrders, error: ordersError } = await supabase
      .from('orders')
      .insert(ordersToInsert)
      .select();

    if (ordersError) {
      // إذا فشل الإرسال الجماعي، حاول واحداً تلو الآخر
      console.warn('Bulk insert failed, trying individual inserts:', ordersError);

      for (let i = 0; i < unsyncedSales.length; i++) {
        const sale = unsyncedSales[i];
        try {
          const { error } = await supabase
            .from('orders')
            .insert({
              order_number: sale.orderNumber,
              customer_id: null,
              subtotal: sale.subtotal,
              tax_total: sale.taxTotal,
              discount_total: sale.discountTotal,
              grand_total: sale.grandTotal,
              payment_method: sale.paymentMethod,
              status: 'completed',
              cashier_id: sale.cashierId,
              cashier_name: sale.cashierName,
              shift_id: sale.shiftId,
              is_offline: true,
              created_at: sale.createdAt,
            });

          if (error) {
            result.failed++;
            result.errors.push(`فشل ${sale.orderNumber}: ${error.message}`);
          } else {
            result.success++;
            await markSaleAsSynced(sale.id);
          }
        } catch (err: any) {
          result.failed++;
          result.errors.push(`فشل ${sale.orderNumber}: ${err.message}`);
        }
        if (onProgress) onProgress(i + 1, total, sale);
      }
    } else {
      // نجاح الإرسال الجماعي - تحديث حالة جميع المبيعات
      result.success = total;
      for (const sale of unsyncedSales) {
        await markSaleAsSynced(sale.id);
        if (onProgress) onProgress(unsyncedSales.indexOf(sale) + 1, total, sale);
      }
    }

    // حذف المبيعات المزامنة لتوفير المساحة
    if (result.success > 0) {
      await clearSyncedSales();
    }

  } catch (err: any) {
    result.errors.push(`خطأ في المزامنة: ${err.message}`);
  }

  return result;
}

// ═══════════════════════════════════════════════════════════
// مزامنة تلقائية عند العودة للاتصال
// ═══════════════════════════════════════════════════════════

/**
 * إعداد المزامنة التلقائية عند العودة للاتصال بالإنترنت
 * Setup automatic sync when connection is restored
 */
export function setupAutoSync(supabase: any, onSyncComplete?: (result: any) => void) {
  if (typeof window === 'undefined') return;

  window.addEventListener('online', async () => {
    console.log('[Offline] Connection restored, syncing offline sales...');
    const result = await syncOfflineSalesToSupabase(supabase);
    if (result.success > 0) {
      console.log(`[Offline] Synced ${result.success} sales`);
      if (onSyncComplete) onSyncComplete(result);
    }
  });
}
