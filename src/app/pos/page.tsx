'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Loader2, Pause, Trash2, Receipt, Minus, Plus, Wallet, CreditCard, Smartphone, Clock, Split, ScanLine, Tag, FileText, Settings, User as UserIcon, LogOut, ChevronRight, Package, SearchCode, Boxes,
  Mic, QrCode, BarChart3, User, ShoppingCart, X, CheckCircle
} from 'lucide-react';
import { PaymentDetailsModal } from '@/components/pos/payment-details-modal';
import { formatCurrency } from '@/lib/utils';
import { normalizeArabic } from '@/lib/arabic-normalize';
import { usePOSStore } from '@/lib/pos/pos-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { useBrandingStore } from '@/lib/store/branding-store';
import { InvoicePreview } from '@/components/pos/invoice-preview';
import { POSErrorBoundary } from '@/components/pos/pos-error-boundary';
import { ShiftModal } from '@/components/pos/shift-modal';
import { HeldOrdersModal } from '@/components/pos/held-orders-modal';
import { SplitPaymentModal } from '@/components/pos/split-payment-modal';
import { CreditSaleModal } from '@/components/pos/credit-sale-modal';
import { ProfileModal } from '@/components/profile/profile-modal';
import { CashierReportsModal } from '@/components/pos/cashier-reports-modal';
import { UnifiedScanner } from '@/components/scanner/unified-scanner';
import { SyncManager } from '@/components/scanner/sync-manager';
import { Tooltip } from '@/components/ui/tooltip';
import { cacheProducts, findProductByBarcode, addOfflineSale, LocalProduct } from '@/lib/offline/db';
import { productService } from '@/lib/supabase/services/products';
import { type ProductCategory } from '@/lib/supabase/services/categories';
import { loadCategories } from '@/lib/category-utils';
import { shiftService, type Shift } from '@/lib/supabase/services/shifts';
import { heldOrderService } from '@/lib/supabase/services/held-orders';
import { createClient } from '@/lib/supabase/client';
import { useVoiceAssistant } from '@/lib/hooks/use-voice-assistant';
import toast from 'react-hot-toast';

const supabase = createClient();

interface POSProduct {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  baseUnit: string;
  categoryId?: string;
  image?: string;
  images?: string[];
  barcode?: string;
  stock?: number;
}

function mapProduct(p: any): POSProduct {
  return {
    id: p.id,
    name: p.name_en || p.name_ar,
    nameAr: p.name_ar,
    price: Number(p.sale_price || p.unit_price || 0),
    baseUnit: p.unit || 'قطعة',
    categoryId: p.category_id,
    image: p.image_url || '/product-placeholder.svg',
    images: p.image_url ? [p.image_url] : [],
    barcode: p.barcode,
    stock: p.current_stock ?? 999,
  };
}

/* ───────────── Product Button ───────────── */
function ProductBtn({ product, onAdd }: { product: POSProduct; onAdd: (p: POSProduct) => void }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const imageUrl = product.image && product.image !== '/product-placeholder.svg' ? product.image : '/product-placeholder.svg';
  const isOutOfStock = product.stock === 0;

  return (
    <button
      onClick={() => { if (!isOutOfStock) onAdd(product); }}
      disabled={isOutOfStock}
      className={`relative group bg-white/40 dark:bg-[#1C1C1E]/50 backdrop-blur-xl rounded-2xl shadow-sm border overflow-hidden text-right transition-all duration-300 active:scale-95 ${isOutOfStock ? 'opacity-50 cursor-not-allowed border-gray-200/50 dark:border-white/5' : 'hover:-translate-y-1 hover:shadow-xl hover:border-emerald-500/50 border-gray-200/50 dark:border-white/[0.08]'}`}
    >
      <div className="relative aspect-square overflow-hidden bg-gray-50 dark:bg-slate-800/30 p-2">
        {!imgLoaded && !imgError && <div className="absolute inset-0 bg-gray-200 dark:bg-slate-700/50 animate-pulse" />}
        <img loading="lazy" src={imgError ? '/product-placeholder.svg' : imageUrl} alt={product.nameAr}
          className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal transition-transform duration-500 group-hover:scale-110"
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)} />
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <span className="text-white text-[10px] font-black bg-red-500 px-2 py-1 rounded-lg shadow-lg">نفذ</span>
          </div>
        )}
        {!isOutOfStock && product.stock !== undefined && product.stock > 0 && product.stock <= 5 && (
          <div className="absolute top-1 right-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-lg shadow-md">
            {product.stock}
          </div>
        )}
      </div>
      <div className="p-2 sm:p-2.5">
        <h3 className={`text-[10px] sm:text-xs font-bold line-clamp-2 leading-tight mb-1 ${isOutOfStock ? 'text-gray-400 dark:text-slate-500' : 'text-gray-900 dark:text-white'}`}>{product.nameAr}</h3>
        <div className="flex items-center justify-between">
          <span className={`text-[11px] sm:text-[13px] font-black ${isOutOfStock ? 'text-gray-300 dark:text-slate-600' : 'text-emerald-600 dark:text-emerald-400'}`}>{formatCurrency(product.price)}</span>
          <span className="text-[8px] text-gray-400">/{product.baseUnit}</span>
        </div>
      </div>
    </button>
  );
}

/* ───────────── Main POS ───────────── */
export default function POSPage() {
  const router = useRouter();
  const auth = useAuthStore();
  const { branding } = useBrandingStore();
  const primaryColor = branding.primaryColor || '#22C55E';

  const role = auth.user?.role;
  const isAllowed = auth.isAuthenticated && (role === 'cashier' || role === 'admin' || role === 'manager');

  useEffect(() => {
    if (!auth.isAuthenticated) { router.replace('/login'); return; }
    if (role !== 'cashier' && role !== 'admin' && role !== 'manager') {
      toast.error('هذه الصفحة متاحة للكاشير فقط');
      router.replace(role === 'customer' ? '/shop' : '/dashboard');
    }
  }, []);

  if (!isAllowed) {
    return (
      <div className="h-dvh flex items-center justify-center bg-gray-50 dark:bg-[#020617]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  return <POSContent primaryColor={primaryColor} userRole={role!} userName={auth.user?.nameAr || auth.user?.name || ''} userId={auth.user?.id || ''} />;
}

function POSContent({ primaryColor, userRole, userName, userId }: { primaryColor: string; userRole: string; userName: string; userId: string }) {
  const router = useRouter();
  const store = usePOSStore();
  const cart = store.cart || [];
  const { addToCart, removeFromCart, updateQuantity, clearCart, getTotal, getSubtotal, getTaxTotal, paymentMethod, setPaymentMethod, completeOrder, lastOrder, taxRate, setTaxRate, setSplitPayments } = store;

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [showInvoice, setShowInvoice] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [processing, setProcessing] = useState(false);
  const [products, setProducts] = useState<POSProduct[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; image?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanMode, setScanMode] = useState<'qr' | 'barcode'>('qr');
  const handleProductClickRef = useRef<((p: POSProduct) => void) | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Modals
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showHeldOrders, setShowHeldOrders] = useState(false);
  const [showSplitPayment, setShowSplitPayment] = useState(false);
  const [showCreditSale, setShowCreditSale] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [heldCart, setHeldCart] = useState<any>(null);
  const [heldOrdersRefreshKey, setHeldOrdersRefreshKey] = useState(0);

  // Voice assistant
  const { isListening, interimText, toggleListening, isSupported } = useVoiceAssistant({
    onSearch: (query) => {
      setSearch(query);
      toast.success(`جاري البحث عن: ${query}`, { duration: 3000 });
    },
    commands: [
      {
        keywords: ['تعليق', 'hold', 'علق', 'حفظ الفاتورة'],
        action: async () => {
          await holdCurrentBill();
          toast.success('تم تعليق الفاتورة');
        },
        priority: 10,
      },
      {
        keywords: ['رصيد', 'كام', 'كم', 'المخزون', 'stock'],
        action: (transcript) => {
          const productName = transcript.replace(/رصيد|كام|كم|الصنف|ده|المخزون|stock/g, '').trim();
          const product = products.find(p => p.nameAr?.includes(productName) || p.name.toLowerCase().includes(productName));
          if (product) {
            toast.success(`رصيد ${product.nameAr}: ${product.stock ?? 0} ${product.baseUnit}`, { duration: 4000 });
          } else {
            toast.error('مش لاقي الصنف ده');
          }
        },
        priority: 10,
      },
      {
        keywords: ['فاتورة', 'بيع', 'checkout', 'دفع'],
        action: (transcript) => {
          setSearch(transcript);
        },
        priority: 10,
      },
    ],
  });

  // تحميل المنتجات والفئات - مع التخزين المحلي للعمل بدون إنترنت
  useEffect(() => {
    async function loadData() {
      try {
        const [prodRes, catRes] = await Promise.allSettled([
          productService.getAll({ limit: 2000, fields: 'id, name_en, name_ar, sale_price, unit_price, unit, category_id, image_url, barcode, current_stock' }),
          loadCategories(),
        ]);

        if (prodRes.status === 'fulfilled' && prodRes.value.data) {
          // Filter locally if needed, but display all loaded products for now
          const mapped = prodRes.value.data.map(mapProduct);
          setProducts(mapped);

          // ═══════════════════════════════════════════════════════
          // تخزين المنتجات في IndexedDB للعمل بدون إنترنت
          // Cache products in IndexedDB for offline-first scanning
          // ═══════════════════════════════════════════════════════
          const localProducts: LocalProduct[] = mapped.map(p => ({
            id: p.id,
            sku: p.id,
            barcode: p.barcode || null,
            nameAr: p.nameAr,
            nameEn: p.name,
            price: p.price,
            costPrice: 0,
            categoryId: p.categoryId || null,
            unit: p.baseUnit,
            stock: p.stock ?? 0,
            isActive: true,
          }));
          await cacheProducts(localProducts);
        }
        if (catRes.status === 'fulfilled' && catRes.value) {
          const cats = [{ id: 'all', name: 'الكل', image: '' }, ...catRes.value.map((c: ProductCategory) => ({ id: c.id, name: c.name_ar, image: c.image_url || '' }))];
          setCategories(cats);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Real-time subscription for product/category updates
  useEffect(() => {
    const channel = supabase.channel('pos-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, async (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const newProduct = (payload.new as any);
          const mapped = mapProduct(newProduct);
          
          setProducts(prev => {
            const index = prev.findIndex(p => p.id === mapped.id);
            if (index >= 0) {
              const updated = [...prev];
              updated[index] = mapped;
              return updated;
            }
            return [...prev, mapped];
          });
          
          const localProd: LocalProduct = {
            id: mapped.id, sku: mapped.id, barcode: mapped.barcode || null, nameAr: mapped.nameAr,
            nameEn: mapped.name, price: mapped.price, costPrice: 0, categoryId: mapped.categoryId || null,
            unit: mapped.baseUnit, stock: mapped.stock ?? 0, isActive: true,
          };
          await cacheProducts([localProd]);
        } else if (payload.eventType === 'DELETE') {
          setProducts(prev => prev.filter(p => p.id !== payload.old.id));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_categories' }, async (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const c = (payload.new as any);
          const mappedCat = { id: c.id, name: c.name_ar, image: c.image_url || '' };
          setCategories(prev => {
            const index = prev.findIndex(cat => cat.id === c.id);
            if (index >= 0) {
              const updated = [...prev];
              updated[index] = mappedCat;
              return updated;
            }
            return [...prev, mappedCat];
          });
        } else if (payload.eventType === 'DELETE') {
          setCategories(prev => prev.filter(cat => cat.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);
  const holdCurrentBill = async () => {
    if (cart.length === 0) {
      toast.error('الفاتورة فارغة');
      return;
    }

    try {
      await heldOrderService.create({
        cashier_id: userId,
        customer_name: '',
        items: cart,
        subtotal: getSubtotal(),
        tax: getTaxTotal(),
        discount: 0,
        total: getTotal(),
        notes: '',
      });

      clearCart();
      setHeldOrdersRefreshKey(prev => prev + 1);
      toast.success('تم تعليق الفاتورة بنجاح');
    } catch (e: any) {
      toast.error(e.message || 'فشل تعليق الفاتورة');
    }
  };

  // Resume held order
  const resumeOrder = (order: any) => {
    if (cart.length > 0) {
      toast.error('في فاتورة حالية، خلصها الأول');
      return;
    }

    // Restore cart items
    order.items.forEach((item: any) => {
      addToCart({
        productId: item.productId,
        name: item.name,
        nameAr: item.nameAr,
        price: item.price,
        quantity: item.quantity,
        barcode: item.barcode || '',
        unit: item.unit,
        taxRate: item.taxRate || 0,
        itemDiscount: item.itemDiscount || 0,
        itemDiscountType: 'none',
        total: item.price * item.quantity,
      });
    });

    // Delete held order
    supabase.from('held_orders').delete().eq('id', order.id);
    toast.success('تم استئناف الفاتورة');
  };

  // Split payment complete
  const handleSplitPayment = async (cash: number, card: number, network: number, wallet: number) => {
    if (cart.length === 0) { toast.error('الفاتورة فارغة'); return; }
    setProcessing(true);
    try {
      const order = await completeOrder();
      setCompletedOrder(order);
      setShowInvoice(true);
      setShowMobileCart(false);
      setShowSplitPayment(false);
      toast.success(`تم البيع - ${order.order_number}`);
    } catch (e) { toast.error('فشل في إتمام الطلب'); console.error(e); }
    finally { setProcessing(false); }
  };

  // ═══════════════════════════════════════════════════════════
  // ماسح QR موحد - يعمل بدون إنترنت
  // Unified QR Scanner - Offline-First with html5-qrcode
  // ═══════════════════════════════════════════════════════════
  const handleScanResult = useCallback(async (result: { rawValue: string; decodedValue: string; format: string }) => {
    setShowScanner(false);

    // البحث عن المنتج في IndexedDB أولاً (بدون إنترنت)
    // Search IndexedDB first - no network request needed
    try {
      const localProduct = await findProductByBarcode(result.decodedValue);
      if (localProduct) {
        const posProduct: POSProduct = {
          id: localProduct.id,
          name: localProduct.nameEn || localProduct.nameAr,
          nameAr: localProduct.nameAr,
          price: localProduct.price,
          baseUnit: localProduct.unit,
          categoryId: localProduct.categoryId || undefined,
          barcode: localProduct.barcode || undefined,
          stock: localProduct.stock,
        };
        if (handleProductClickRef.current) {
          handleProductClickRef.current(posProduct);
        }
        return;
      }
    } catch {
      // إذا فشل البحث المحلي، ابحث في الذاكرة
      // If local DB fails, search in memory
    }

    // البحث في المنتجات المحملة في الذاكرة
    // Fallback: search in memory-loaded products
    const p = products.find(x => x.barcode === result.decodedValue || x.barcode === result.rawValue);
    if (p && handleProductClickRef.current) {
      handleProductClickRef.current(p);
      return;
    }

    // لم يتم العثور على منتج - عرض المحتوى
    // Product not found - show content info
    if (result.format === 'qr') {
      const { parseQRContent, handleQRAction } = await import('@/components/scanner/unified-scanner');
      const handled = handleQRAction(result.decodedValue);
      if (!handled) toast.success(parseQRContent(result.decodedValue));
    } else {
      toast.success(`الكود: ${result.decodedValue}`);
    }
  }, [products]);

  const filtered = products.filter(p => {
    const nSearch = normalizeArabic(search);
    const nNameAr = normalizeArabic(p.nameAr);
    const nName = p.name.toLowerCase();
    const ms = !search || nNameAr.includes(nSearch) || nName.includes(nSearch.toLowerCase()) || (p.barcode && p.barcode.includes(search));
    return category === 'all' ? ms : ms && p.categoryId === category;
  });

  const handleProductClick = useCallback((p: POSProduct) => {
    addToCart({
      productId: p.id,
      name: p.name,
      nameAr: p.nameAr,
      price: p.price,
      quantity: 1,
      barcode: p.barcode || '',
      unit: p.baseUnit,
      taxRate: 0,
      itemDiscount: 0,
      itemDiscountType: 'none',
      total: p.price * 1,
    });
    toast.success(`${p.nameAr} تمت الإضافة`);
  }, [addToCart]);

  // Global physical barcode scanner listener (capturing phase)
  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const diff = now - lastKeyTime;
      lastKeyTime = now;

      // If typed slower than 50ms, it's typed by a human, so reset buffer
      if (diff > 50) {
        barcodeBuffer = '';
      }

      if (e.key.length === 1 && /^[a-zA-Z0-9]$/.test(e.key)) {
        barcodeBuffer += e.key;
      } else if (e.key === 'Enter') {
        if (barcodeBuffer.length >= 3) {
          e.preventDefault();
          e.stopPropagation();
          const code = barcodeBuffer;
          barcodeBuffer = '';
          
          const triggerScan = async () => {
            try {
              const localProduct = await findProductByBarcode(code);
              if (localProduct) {
                const posProduct: POSProduct = {
                  id: localProduct.id,
                  name: localProduct.nameEn || localProduct.nameAr,
                  nameAr: localProduct.nameAr,
                  price: localProduct.price,
                  baseUnit: localProduct.unit,
                  categoryId: localProduct.categoryId || undefined,
                  barcode: localProduct.barcode || undefined,
                  stock: localProduct.stock,
                };
                handleProductClick(posProduct);
                return;
              }
            } catch (err) {
              console.error(err);
            }

            const p = products.find(x => x.barcode === code);
            if (p) {
              handleProductClick(p);
            } else {
              toast.error(`باركود غير مسجل: ${code}`);
            }
          };

          triggerScan();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [products, handleProductClick]);

  // Update ref for scanner
  handleProductClickRef.current = handleProductClick;

  const total = getTotal();
  const subtotal = getSubtotal();
  const taxTotal = getTaxTotal();

  const handleCompleteOrder = async (splitPayments?: any[], paymentDetails?: any) => {
    if (cart.length === 0) { toast.error('الفاتورة فارغة'); return; }
    if (!currentShift) {
      toast.error('افتح الوردية الأول');
      setShowShiftModal(true);
      return;
    }

    if (!paymentDetails && !splitPayments && (paymentMethod === 'card' || paymentMethod === 'wallet')) {
      setShowPaymentDetails(true);
      return;
    }

    if (splitPayments && splitPayments.length > 0) {
      setSplitPayments(splitPayments);
      setPaymentMethod('mixed');
    }
    setProcessing(true);
    try {
      const order = await completeOrder();

      // ═══════════════════════════════════════════════════════════
      // حفظ العملية في المخزن المحلي للمزامنة لاحقاً
      // Save to offline sales buffer for later sync with Supabase
      // ═══════════════════════════════════════════════════════════
      try {
        await addOfflineSale({
          id: order.id || `offline_${Date.now()}`,
          orderNumber: order.order_number || `POS-${Date.now()}`,
          items: cart.map(item => ({
            productId: item.productId,
            name: item.name,
            nameAr: item.nameAr,
            price: item.price,
            quantity: item.quantity,
            barcode: item.barcode || '',
            unit: item.unit,
            taxRate: item.taxRate || 0,
            itemDiscount: item.itemDiscount || 0,
            total: item.total,
          })),
          subtotal: subtotal,
          taxTotal: taxTotal,
          discountTotal: 0,
          grandTotal: total,
          paymentMethod: splitPayments && splitPayments.length > 0 ? 'mixed' : paymentMethod,
          cashierId: userId,
          cashierName: userName,
          shiftId: currentShift?.id || null,
          createdAt: new Date().toISOString(),
          synced: false,
          paymentDetails: paymentDetails || null,
        });
      } catch (e) {
        console.error('Failed to save offline sale:', e);
      }

      if (paymentDetails) {
        order.customerName = paymentDetails.customerName;
        order.customerPhone = paymentDetails.customerPhone;
        order.paymentDetails = paymentDetails;
      }

      setCompletedOrder(order);
      setShowInvoice(true);
      setShowMobileCart(false);
      toast.success(`تم البيع - ${order.order_number}`);
    } catch (e) { toast.error('فشل في إتمام الطلب'); console.error(e); }
    finally { setProcessing(false); }
  };

  const handleLogout = () => {
    useAuthStore.getState().logout();
    router.push('/login');
    toast.success('تم تسجيل الخروج');
  };

  if (loading) {
    return <div className="h-dvh flex items-center justify-center bg-gray-50 dark:bg-[#020617]"><Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} /></div>;
  }

  return (
    <div className="h-dvh flex flex-col bg-gray-100 dark:bg-[#020617] overflow-hidden" dir="rtl">

      {/* ═══════════ TOP BAR - Apple Frosted Glass ═══════════ */}
      <div className="apple-glass shrink-0 sticky top-0 z-40">
        {/* Row 1: Search Bar */}
        <div className="px-2 py-1.5 md:px-4 md:py-2.5">
          <div className="flex items-center gap-1.5 md:gap-2">
            {/* Back Button (Manager/Admin) */}
            {(userRole === 'manager' || userRole === 'admin') && (
              <Tooltip text="رجوع للوحة التحكم">
                <button
                  onClick={() => router.push(userRole === 'admin' ? '/admin' : '/dashboard')}
                  className="h-9 w-9 md:h-11 md:w-11 rounded-lg md:rounded-xl flex items-center justify-center shrink-0 transition-all bg-gray-100/80 dark:bg-slate-800/80 text-gray-500 hover:bg-gray-200/80 dark:hover:bg-slate-700/80 backdrop-blur-sm"
                >
                  <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
                </button>
              </Tooltip>
            )}
            {/* Search Input - Apple Style */}
            <div className="flex-1 relative">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="ابحث عن منتج..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 md:h-11 pr-8 md:pr-10 pl-3 md:pl-4 rounded-lg md:rounded-xl bg-gray-100/80 dark:bg-slate-800/80 border border-transparent focus:border-blue-500/50 focus:bg-white/90 dark:focus:bg-slate-800/90 text-[11px] md:text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all backdrop-blur-sm"
              />
            </div>
            <Tooltip text="المساعد الصوتي">
              <button
                onClick={toggleListening}
                className={`h-9 w-9 md:h-11 md:w-11 rounded-lg md:rounded-xl flex items-center justify-center shrink-0 transition-all ${
                  isListening
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100/80 dark:bg-slate-800/80 text-gray-500 hover:bg-gray-200/80 dark:hover:bg-slate-700/80 backdrop-blur-sm'
                }`}
              >
                {isListening ? (
                  <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
                ) : (
                  <Mic className="h-4 w-4 md:h-5 md:w-5" />
                )}
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Row 2: Action Buttons */}
        <div className="px-2 pb-1.5 md:px-4 md:pb-2.5">
          <div className="flex items-center gap-1 md:gap-1.5 overflow-x-auto scrollbar-hide">
            {/* Shift Status */}
            <Tooltip text="إدارة الوردية">
              <button
                onClick={() => setShowShiftModal(true)}
                className={`h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
                  currentShift
                    ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                    : 'bg-red-500/10 text-red-600 dark:text-red-400'
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{currentShift ? 'مفتوحة' : 'مغلقة'}</span>
              </button>
            </Tooltip>

            {/* Cashier Reports */}
            <Tooltip text="التقارير">
              <button
                onClick={() => setShowReportsModal(true)}
                className="h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">التقارير</span>
              </button>
            </Tooltip>

            {/* Divider */}
            <div className="w-px h-6 bg-gray-200/50 dark:bg-slate-700/50 shrink-0" />

            {/* Held Orders */}
            <Tooltip text="الفواتير المعلقة">
              <button
                onClick={() => setShowHeldOrders(true)}
                className="h-9 w-9 rounded-lg bg-gray-100/80 dark:bg-slate-800/80 text-gray-500 hover:bg-gray-200/80 dark:hover:bg-slate-700/80 flex items-center justify-center shrink-0 transition-all backdrop-blur-sm"
              >
                <Pause className="h-4 w-4" />
              </button>
            </Tooltip>

            {/* QR Scanner */}
            <Tooltip text="مسح QR">
              <button
                onClick={() => { setScanMode('qr'); setShowScanner(true); }}
                className="h-9 w-9 rounded-lg bg-gray-100/80 dark:bg-slate-800/80 text-gray-500 hover:bg-gray-200/80 dark:hover:bg-slate-700/80 flex items-center justify-center shrink-0 transition-all backdrop-blur-sm"
              >
                <QrCode className="h-4 w-4" />
              </button>
            </Tooltip>

            {/* Barcode Scanner - Unified */}
            <Tooltip text="مسح باركود">
              <button
                onClick={() => { setScanMode('barcode'); setShowScanner(true); }}
                className="h-9 w-9 rounded-lg bg-gray-100/80 dark:bg-slate-800/80 text-gray-500 hover:bg-gray-200/80 dark:hover:bg-slate-700/80 flex items-center justify-center shrink-0 transition-all backdrop-blur-sm"
              >
                <ScanLine className="h-4 w-4" />
              </button>
            </Tooltip>

            {/* Split Payment */}
            <Tooltip text="الدفع المتعدد">
              <button
                onClick={() => {
                  if (cart.length === 0) {
                    toast.error('الفاتورة فارغة');
                    return;
                  }
                  setShowSplitPayment(true);
                }}
                className="h-9 w-9 rounded-lg bg-gray-100/80 dark:bg-slate-800/80 text-gray-500 hover:bg-gray-200/80 dark:hover:bg-slate-700/80 flex items-center justify-center shrink-0 transition-all backdrop-blur-sm"
              >
                <Split className="h-4 w-4" />
              </button>
            </Tooltip>

            {/* Coding - Inventory Management */}
            <Tooltip text="التكويـد">
              <button
                onClick={() => router.push('/manager/coding')}
                className="h-9 w-9 rounded-lg bg-gray-100/80 dark:bg-slate-800/80 text-gray-500 hover:bg-gray-200/80 dark:hover:bg-slate-700/80 flex items-center justify-center shrink-0 transition-all backdrop-blur-sm"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
              </button>
            </Tooltip>

            {/* Audit - Inventory Count */}
            <Tooltip text="الجرد">
              <button
                onClick={() => router.push('/manager/audit')}
                className="h-9 w-9 rounded-lg bg-gray-100/80 dark:bg-slate-800/80 text-gray-500 hover:bg-gray-200/80 dark:hover:bg-slate-700/80 flex items-center justify-center shrink-0 transition-all backdrop-blur-sm"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              </button>
            </Tooltip>

            {/* Divider */}
            <div className="w-px h-6 bg-gray-200/50 dark:bg-slate-700/50 shrink-0" />

            {/* Reports - desktop only */}
            <Tooltip text="المرتجعات">
              <button
                onClick={() => router.push('/pos/returns')}
                className="hidden md:flex h-9 w-9 rounded-lg bg-gray-100/80 dark:bg-slate-800/80 text-gray-500 hover:bg-gray-200/80 dark:hover:bg-slate-700/80 items-center justify-center shrink-0 transition-all backdrop-blur-sm"
              >
                <BarChart3 className="h-4 w-4" />
              </button>
            </Tooltip>

            {/* Spacer */}
            <div className="flex-1" />

            {/* User info - desktop only */}
            <button onClick={() => setShowProfileModal(true)}
              className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-100/80 dark:bg-slate-800/80 backdrop-blur-sm hover:bg-gray-200/80 dark:hover:bg-slate-700/80 cursor-pointer transition-all">
              <div className="h-6 w-6 rounded-full bg-blue-500/10 flex items-center justify-center">
                <User className="h-3 w-3 text-blue-500" />
              </div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{userName}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                userRole === 'admin'
                  ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                  : userRole === 'manager'
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  : 'bg-green-500/10 text-green-600 dark:text-green-400'
              }`}>
                {userRole === 'admin' ? 'ADMIN' : userRole === 'manager' ? 'MGR' : 'CASH'}
              </span>
            </button>

            {/* User Profile Button - mobile only */}
            <div className="md:hidden relative">
              <Tooltip text="الملف الشخصي">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="h-9 w-9 rounded-lg bg-gray-100/80 dark:bg-slate-800/80 flex items-center justify-center hover:bg-gray-200/80 dark:hover:bg-slate-700/80 shrink-0 transition-all backdrop-blur-sm"
                >
                  <User className="h-4 w-4 text-gray-500" />
                </button>
              </Tooltip>
              {showProfileMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                  <div className="fixed top-14 left-2 mt-2 w-52 rounded-xl border bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-lg z-50 py-1">
                    <div className="px-3 py-2 border-b border-gray-200/50 dark:border-slate-700/50">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{userName}</p>
                      <p className="text-xs text-gray-400">{userRole === 'cashier' ? 'كاشير' : userRole === 'manager' ? 'مدير' : 'أدمن'}</p>
                    </div>
                    <button onClick={() => { setShowProfileMenu(false); setShowShiftModal(true); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-slate-800/50 transition-colors">
                      <Clock className="h-4 w-4" /> إدارة الوردية
                    </button>
                    <button onClick={() => { setShowProfileMenu(false); setShowProfileModal(true); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-slate-800/50 transition-colors">
                      <User className="h-4 w-4" /> الملف الشخصي
                    </button>
                    <button onClick={() => { setShowProfileMenu(false); router.push('/manager/coding'); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-slate-800/50 transition-colors">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg> التكويـد
                    </button>
                    <button onClick={() => { setShowProfileMenu(false); router.push('/manager/audit'); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-slate-800/50 transition-colors">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> الجرد
                    </button>
                    <button onClick={() => { setShowProfileMenu(false); router.push('/pos/returns'); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-slate-800/50 transition-colors">
                      <BarChart3 className="h-4 w-4" /> التقارير
                    </button>
                    <button onClick={() => { setShowProfileMenu(false); handleLogout(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors">
                      <LogOut className="h-4 w-4" /> تسجيل خروج
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Logout - desktop only */}
            <Tooltip text="تسجيل خروج">
              <button
                onClick={handleLogout}
                className="hidden md:flex h-9 w-9 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/15 items-center justify-center shrink-0 transition-all"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </Tooltip>

            {/* Mobile cart toggle */}
            <button
              onClick={() => setShowMobileCart(true)}
              className="md:hidden h-9 w-9 rounded-lg text-white flex items-center justify-center relative shrink-0"
              style={{ backgroundColor: 'var(--apple-blue, #007AFF)' }}
            >
              <ShoppingCart className="h-4 w-4" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center font-bold ring-2 ring-white">
                  {cart.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════ MAIN CONTENT ═══════════ */}
      <div className="flex-1 flex overflow-hidden min-h-0 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-[#020617] dark:to-slate-900/50">

        {/* ─── Products Grid & Categories ─── */}
        <div className="flex-1 overflow-y-auto p-2 md:p-4 scrollbar-hide flex flex-col gap-3">
          
          {/* ─── Category Tabs ─── */}
          <div className="flex gap-2 overflow-x-auto pb-2 pt-1 px-1 scrollbar-hide shrink-0">
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 shadow-sm border backdrop-blur-md flex items-center gap-2 ${
                  category === c.id
                    ? 'bg-emerald-500 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-105'
                    : 'bg-white/40 dark:bg-slate-800/40 text-gray-700 dark:text-gray-300 border-white/20 dark:border-white/10 hover:bg-white/60 dark:hover:bg-slate-700/60 hover:scale-105'
                }`}
              >
                {c.image && <img loading="lazy" src={c.image} alt={c.name} className="w-5 h-5 object-contain" />}
                {c.name}
              </button>
            ))}
          </div>

          {filtered.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 md:gap-3 lg:gap-4 pb-20 md:pb-6">
              {filtered.map(p => <ProductBtn key={p.id} product={p} onAdd={handleProductClick} />)}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
              <Search className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-xs font-medium">لا توجد منتجات</p>
            </div>
          )}
        </div>

        {/* ─── Cart Panel (Desktop) ─── */}
        <div className="hidden md:flex flex-col w-80 lg:w-[420px] xl:w-[480px] bg-white/60 dark:bg-slate-950/60 backdrop-blur-3xl border-l border-white/20 dark:border-white/10 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)] shrink-0 z-10">
          <CartPanel
            cart={cart} primaryColor={primaryColor} total={total} subtotal={subtotal} taxTotal={taxTotal}
            paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod}
            onUpdateQty={updateQuantity} onRemove={removeFromCart} onClear={clearCart}
            onComplete={handleCompleteOrder} processing={processing}
            onHold={holdCurrentBill}
            taxRate={taxRate} setTaxRate={setTaxRate}
            onCreditClick={() => setShowCreditSale(true)}
          />
        </div>
      </div>

      {/* ─── Mobile Bottom Bar ─── */}
      <div className="md:hidden bg-white dark:bg-slate-950 border-t border-gray-200 dark:border-slate-800 px-2 py-1.5 shrink-0">
        <button onClick={() => { if (cart.length === 0) { toast.error('الفاتورة فارغة'); return; } setShowMobileCart(true); }}
          className="w-full h-9 rounded-lg text-white font-bold text-[11px] flex items-center justify-between px-2.5 shadow-md"
          style={{ backgroundColor: primaryColor }}>
          <span className="flex items-center gap-1.5"><ShoppingCart className="h-3 w-3" /> {cart.length} منتج</span>
          <span>{formatCurrency(total)}</span>
        </button>
      </div>

      {/* ─── Mobile Cart Sheet ─── */}
      <AnimatePresence>
        {showMobileCart && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 md:hidden" onClick={() => setShowMobileCart(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-950 rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col md:hidden" dir="rtl">
              <div className="flex justify-center pt-2 pb-1"><div className="h-1 w-10 rounded-full bg-gray-300 dark:bg-slate-600" /></div>
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-slate-800">
                <h3 className="text-xs font-bold">الفاتورة ({cart.length})</h3>
                <button onClick={() => setShowMobileCart(false)}><X className="h-3.5 w-3.5 text-gray-400" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 min-h-0">
                <CartPanel
                  cart={cart} primaryColor={primaryColor} total={total} subtotal={subtotal} taxTotal={taxTotal}
                  paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod}
                  onUpdateQty={updateQuantity} onRemove={removeFromCart} onClear={clearCart}
                  onComplete={(p: any) => { handleCompleteOrder(p); setShowMobileCart(false); }} processing={processing}
                  onHold={async () => { await holdCurrentBill(); setShowMobileCart(false); }}
                  taxRate={taxRate} setTaxRate={setTaxRate}
                  isMobile
                  onCreditClick={() => { setShowMobileCart(false); setShowCreditSale(true); }}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Invoice Preview ─── */}
      <AnimatePresence>
        {showInvoice && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-[200]" onClick={() => { setShowInvoice(false); setCompletedOrder(null); }} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-[200] bg-white dark:bg-[#020617] flex items-center justify-center p-4 max-w-md mx-auto" dir="rtl">
              <InvoicePreview order={completedOrder} onClose={() => { setShowInvoice(false); setCompletedOrder(null); }} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════
          ماسح QR موحد - يعمل بدون إنترنت
          Unified QR Scanner - Offline-First with html5-qrcode
          ═══════════════════════════════════════════════════════════ */}
      <UnifiedScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScanResult}
        mode={scanMode}
      />

      {/* ═══════════════════════════════════════════════════════════
          لوحة مزامنة المدير - Manager Sync Panel
          ═══════════════════════════════════════════════════════════ */}
      <SyncManager userRole={userRole} />

      {/* ─── Modals ─── */}
      <ShiftModal isOpen={showShiftModal} onClose={() => setShowShiftModal(false)} cashierId={userId} onShiftChange={setCurrentShift} />
      <HeldOrdersModal isOpen={showHeldOrders} onClose={() => setShowHeldOrders(false)} onResume={resumeOrder} cashierId={userId} refreshKey={heldOrdersRefreshKey} />
      <SplitPaymentModal isOpen={showSplitPayment} onClose={() => setShowSplitPayment(false)} total={total} onComplete={handleSplitPayment} />
      <PaymentDetailsModal isOpen={showPaymentDetails} onClose={() => setShowPaymentDetails(false)} method={paymentMethod as 'card'|'wallet'} total={total} onConfirm={(details) => { setShowPaymentDetails(false); handleCompleteOrder(undefined, details); }} />
      <ProfileModal open={showProfileModal} onClose={() => setShowProfileModal(false)} />
      <CreditSaleModal
        isOpen={showCreditSale}
        onClose={() => setShowCreditSale(false)}
        total={total}
        onComplete={async (customer, installments) => {
          setShowCreditSale(false);
          setPaymentMethod('credit');
          try {
            const order = await completeOrder();
            setCompletedOrder(order);
            setShowInvoice(true);
            setShowMobileCart(false);
            toast.success(`بيع آجل - ${customer.name} - ${order.order_number}`);
          } catch (e) {
            toast.error('فشل في إتمام البيع الآجل');
            console.error(e);
          }
        }}
      />
    </div>
  );
}

/* ───────────── Cart Panel ───────────── */
function CartPanel({ cart, primaryColor, total, subtotal, taxTotal, paymentMethod, setPaymentMethod, onUpdateQty, onRemove, onClear, onComplete, processing, onHold, taxRate, setTaxRate, isMobile, onCreditClick }: any) {
  const [showSplit, setShowSplit] = useState(false);
  const [splitCash, setSplitCash] = useState('');
  const [splitCard, setSplitCard] = useState('');
  const [splitWallet, setSplitWallet] = useState('');
  const [splitCredit, setSplitCredit] = useState('');
  const [creditDueDate, setCreditDueDate] = useState('');
  const [splitCardName, setSplitCardName] = useState('');
  const [splitCardPhone, setSplitCardPhone] = useState('');
  const [splitWalletName, setSplitWalletName] = useState('');
  const [splitWalletPhone, setSplitWalletPhone] = useState('');

  const handleSplitPay = () => {
    const payments: any[] = [];
    if (splitCash) payments.push({ method: 'cash', amount: parseFloat(splitCash) });
    if (splitCard) payments.push({ method: 'card', amount: parseFloat(splitCard) });
    if (splitWallet) payments.push({ method: 'wallet', amount: parseFloat(splitWallet) });
    if (splitCredit) {
      if (!creditDueDate) {
        toast.error('حدد تاريخ السداد للدفع الآجل');
        return;
      }
      payments.push({ method: 'credit', amount: parseFloat(splitCredit), dueDate: creditDueDate });
    }
    const sum = payments.reduce((s, p) => s + p.amount, 0);
    if (Math.abs(sum - total) > 0.01) {
      toast.error(`المجموع ${formatCurrency(sum)} مش بيطابق ${formatCurrency(total)}`);
      return;
    }
    onComplete(payments);
    setShowSplit(false);
    setSplitCash('');
    setSplitCard('');
    setSplitWallet('');
    setSplitCredit('');
    setCreditDueDate('');
  };

  const paymentLabels: Record<string, string> = {
    cash: 'نقداً', card: 'بطاقة', online: 'أونلاين', wallet: 'محفظة', credit: 'آجل', mixed: 'متعدد',
  };

  return (
    <div className="flex flex-col h-full">
      {/* Cart Header */}
      <div className={`border-b border-gray-100 dark:border-slate-800 flex items-center justify-between shrink-0 ${isMobile ? 'px-2 py-2' : 'px-3 py-2.5'}`}>
        <div className="flex items-center gap-1.5">
          <Receipt className={`text-gray-400 ${isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
          <span className={`font-bold text-gray-900 dark:text-white ${isMobile ? 'text-xs' : 'text-sm'}`}>الفاتورة</span>
          <span className={`px-1 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 ${isMobile ? 'text-[9px]' : 'text-[10px]'}`}>{cart.length}</span>
        </div>
        <div className="flex items-center gap-1">
          {cart.length > 0 && (
            <button onClick={onHold} className={`rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center hover:bg-amber-100 transition-colors ${isMobile ? 'h-6 w-6' : 'h-7 w-7'}`} title="تعليق">
              <Pause className={`${isMobile ? 'h-3 w-3' : 'h-3.5 w-3.5'} text-amber-500`} />
            </button>
          )}
          {cart.length > 0 && (
            <button onClick={onClear} className={`rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center hover:bg-red-100 transition-colors ${isMobile ? 'h-6 w-6' : 'h-7 w-7'}`} title="تفريغ">
              <Trash2 className={`${isMobile ? 'h-3 w-3' : 'h-3.5 w-3.5'} text-red-500`} />
            </button>
          )}
        </div>
      </div>

      {/* Cart Items */}
      <div className={`flex-1 overflow-y-auto space-y-1 ${isMobile ? 'p-1.5' : 'p-2'}`}>
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <ShoppingCart className={`mb-2 opacity-30 ${isMobile ? 'w-8 h-8' : 'w-10 h-10'}`} />
            <p className={`text-gray-400 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>أضف منتجات للفاتورة</p>
          </div>
        ) : cart.map((item: any) => (
          <motion.div layout key={item.productId} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className={`flex items-center gap-1.5 rounded-lg bg-gray-50 dark:bg-slate-900/50 ${isMobile ? 'p-1.5' : 'p-2'}`}>
            <div className="flex-1 min-w-0">
              <p className={`text-gray-900 dark:text-white truncate ${isMobile ? 'text-[10px] font-bold' : 'text-xs font-bold'}`}>{item.nameAr}</p>
              <p className={`text-gray-400 ${isMobile ? 'text-[8px]' : 'text-[9px]'}`}>{formatCurrency(item.price)}/{item.unit}</p>
            </div>
            <div className={`flex items-center gap-0.5 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700 ${isMobile ? '' : ''}`}>
              <button onClick={() => onUpdateQty(item.productId, Math.max(1, item.quantity - 1))} className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 rounded-l`}>
                <Minus className={`${isMobile ? 'h-2 w-2' : 'h-2.5 w-2.5'} text-gray-500`} />
              </button>
              <span className={`${isMobile ? 'w-5 text-[10px]' : 'w-6 text-xs'} text-center font-black`}>{item.quantity}</span>
              <button onClick={() => onUpdateQty(item.productId, item.quantity + 1)} className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 rounded-r`}>
                <Plus className={`${isMobile ? 'h-2 w-2' : 'h-2.5 w-2.5'} text-gray-500`} />
              </button>
            </div>
            <p className={`font-black ${isMobile ? 'text-[10px] w-12' : 'text-xs w-14'} text-left`} style={{ color: primaryColor }}>{formatCurrency(item.price * item.quantity)}</p>
            <button onClick={() => onRemove(item.productId)} className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6'} rounded hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center shrink-0`}>
              <Trash2 className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} text-red-400`} />
            </button>
          </motion.div>
        ))}
      </div>

      {/* Cart Footer */}
      {cart.length > 0 && (
        <div className={`border-t border-gray-100 dark:border-slate-800 space-y-2 shrink-0 ${isMobile ? 'p-2' : 'p-3'}`}>
          {/* Tax Rate Config */}
          <div className={`flex items-center justify-between ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
            <span className="text-gray-500">الضريبة</span>
            <div className="flex items-center gap-1">
              <input type="number" value={taxRate ?? 14} onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                className={`px-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 text-center font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${isMobile ? 'w-12 h-6 text-[10px]' : 'w-14 h-7 text-xs'}`} />
              <span className="text-gray-400">%</span>
            </div>
          </div>

          {/* Totals */}
          <div className={`space-y-0.5 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
            <div className="flex justify-between text-gray-500"><span>المجموع</span><span>{formatCurrency(subtotal)}</span></div>
            {taxTotal > 0 && <div className="flex justify-between text-gray-500"><span>الضريبة ({taxRate ?? 14}%)</span><span>{formatCurrency(taxTotal)}</span></div>}
            <div className={`flex justify-between font-black pt-1 border-t border-gray-200 dark:border-slate-700 ${isMobile ? 'text-xs' : 'text-base'}`}>
              <span>الإجمالي</span>
              <span style={{ color: primaryColor }}>{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {[
              { id: 'cash', label: 'نقداً', icon: Wallet, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-500/20', borderColor: 'border-emerald-500', activeBg: 'bg-emerald-50 dark:bg-emerald-900/20' },
              { id: 'card', label: 'بطاقة بنكية', icon: CreditCard, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-500/20', borderColor: 'border-blue-500', activeBg: 'bg-blue-50 dark:bg-blue-900/20' },
              { id: 'wallet', label: 'محفظة', icon: Smartphone, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-500/20', borderColor: 'border-purple-500', activeBg: 'bg-purple-50 dark:bg-purple-900/20' },
              { id: 'credit', label: 'دفع آجل', icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-500/20', borderColor: 'border-amber-500', activeBg: 'bg-amber-50 dark:bg-amber-900/20' },
            ].map(({ id, label, icon: I, color, bg, borderColor, activeBg }: any) => {
              const isSelected = id === 'credit' ? false : paymentMethod === id;
              return (
                <button key={id}
                  onClick={() => id === 'credit' ? onCreditClick?.() : setPaymentMethod(id)}
                  className={`relative p-2.5 rounded-xl border-2 transition-all duration-300 flex items-center gap-2.5 group overflow-hidden ${
                    isSelected
                      ? `${borderColor} ${activeBg} shadow-sm`
                      : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-gray-300 dark:hover:border-slate-600 shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${bg} ${color}`}>
                    <I className="h-4 w-4" />
                  </div>
                  <div className="flex-1 text-right">
                    <span className={`block text-[11px] sm:text-xs font-bold ${isSelected ? color : 'text-gray-700 dark:text-gray-300'}`}>
                      {label}
                    </span>
                  </div>
                  {isSelected && (
                    <motion.div layoutId={`payment-check-${isMobile ? 'm' : 'd'}`} className={`absolute top-1.5 left-1.5 rounded-full p-0.5 ${bg} ${color}`}>
                      <CheckCircle className="h-3 w-3" />
                    </motion.div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Split Payment Button */}
          <button onClick={() => setShowSplit(!showSplit)}
            className={`w-full rounded-lg border border-dashed border-gray-300 dark:border-slate-600 text-gray-500 hover:text-gray-700 dark:hover:text-white transition-colors flex items-center justify-center gap-1 ${isMobile ? 'h-7 text-[10px]' : 'h-8 text-xs'}`}>
            <Split className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'}`} /> دفع متعدد
          </button>

          {/* Split Payment Form */}
          {showSplit && (
            <div className={`rounded-lg bg-gray-50 dark:bg-slate-900/50 ${isMobile ? 'p-1.5 space-y-1.5' : 'space-y-2 p-2'}`}>
              <p className={`font-bold text-gray-500 ${isMobile ? 'text-[9px]' : 'text-[10px]'}`}>قسّم المبلغ ({formatCurrency(total)})</p>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className={`text-gray-400 ${isMobile ? 'text-[8px]' : 'text-[9px]'}`}>نقداً</label>
                  <input type="number" value={splitCash} onChange={(e) => setSplitCash(e.target.value)} placeholder="0"
                    className={`w-full px-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none ${isMobile ? 'h-7' : 'h-8'}`} />
                </div>
                <div>
                  <label className={`text-gray-400 ${isMobile ? 'text-[8px]' : 'text-[9px]'}`}>بطاقة</label>
                  <input type="number" value={splitCard} onChange={(e) => setSplitCard(e.target.value)} placeholder="0"
                    className={`w-full px-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none ${isMobile ? 'h-7' : 'h-8'}`} />
                  {splitCard && parseFloat(splitCard) > 0 && (
                    <div className="mt-1 space-y-1">
                      <input type="text" placeholder="صاحب البطاقة" value={splitCardName} onChange={(e) => setSplitCardName(e.target.value)}
                        className={`w-full px-2 rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 text-xs focus:outline-none ${isMobile ? 'h-6' : 'h-7'}`} />
                      <input type="tel" placeholder="رقم التليفون" value={splitCardPhone} onChange={(e) => setSplitCardPhone(e.target.value)}
                        className={`w-full px-2 rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 text-xs focus:outline-none ${isMobile ? 'h-6' : 'h-7'}`} />
                    </div>
                  )}
                </div>
                <div>
                  <label className={`text-gray-400 ${isMobile ? 'text-[8px]' : 'text-[9px]'}`}>محفظة / إنستاباي</label>
                  <input type="number" value={splitWallet} onChange={(e) => setSplitWallet(e.target.value)} placeholder="0"
                    className={`w-full px-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none ${isMobile ? 'h-7' : 'h-8'}`} />
                  {splitWallet && parseFloat(splitWallet) > 0 && (
                    <div className="mt-1 space-y-1">
                      <input type="text" placeholder="صاحب المحفظة" value={splitWalletName} onChange={(e) => setSplitWalletName(e.target.value)}
                        className={`w-full px-2 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 text-xs focus:outline-none ${isMobile ? 'h-6' : 'h-7'}`} />
                      <input type="tel" placeholder="رقم المحفظة / التليفون" value={splitWalletPhone} onChange={(e) => setSplitWalletPhone(e.target.value)}
                        className={`w-full px-2 rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800 text-xs focus:outline-none ${isMobile ? 'h-6' : 'h-7'}`} />
                    </div>
                  )}
                </div>
                <div>
                  <label className={`text-gray-400 ${isMobile ? 'text-[8px]' : 'text-[9px]'}`}>آجل</label>
                  <input type="number" value={splitCredit} onChange={(e) => setSplitCredit(e.target.value)} placeholder="0"
                    className={`w-full px-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none ${isMobile ? 'h-7' : 'h-8'}`} />
                </div>
              </div>
              {/* Credit Due Date */}
              {splitCredit && parseFloat(splitCredit) > 0 && (
                <div>
                  <label className={`font-bold ${isMobile ? 'text-[8px] text-amber-600' : 'text-[9px] text-amber-600'}`}>تاريخ سداد الآجل *</label>
                  <input type="date" value={creditDueDate} onChange={(e) => setCreditDueDate(e.target.value)} min={new Date().toISOString().split('T')[0]}
                    className={`w-full px-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${isMobile ? 'h-7' : 'h-8'}`} />
                </div>
              )}
              <button onClick={handleSplitPay}
                className={`w-full rounded-lg text-white font-bold ${isMobile ? 'h-8 text-[10px]' : 'h-9 text-xs'}`} style={{ backgroundColor: primaryColor }}>
                تأكيد الدفع المتعدد
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-1.5">
            <button onClick={onHold} className={`rounded-xl border border-amber-500 text-amber-600 font-bold flex items-center justify-center gap-1 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors ${isMobile ? 'h-10 px-2 text-[10px]' : 'h-11 px-3 text-xs'}`}>
              <Pause className={isMobile ? 'h-3 w-3' : 'h-3.5 w-3.5'} /> تعليق
            </button>
            <button onClick={() => onComplete()} disabled={processing}
              className={`flex-1 rounded-xl text-white font-bold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-all ${isMobile ? 'h-10 text-xs' : 'h-11 text-sm'}`}
              style={{ backgroundColor: primaryColor }}>
              {processing ? <Loader2 className={isMobile ? 'h-3.5 w-3.5 animate-spin' : 'h-4 w-4 animate-spin'} /> : <CheckCircle className={isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'} />}
              إتمام البيع
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

