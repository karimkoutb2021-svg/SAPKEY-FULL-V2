'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Search, Mic, SlidersHorizontal, ShoppingCart, X, CheckCircle, MessageCircle, CreditCard, Wallet, ChevronRight, Star, Heart, Plus, Minus, Filter, Grid, List, User, Store, Image as ImageIcon, Loader2, Percent, Home, Package, Truck, LogOut, Zap, Gift } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/lib/store/ecommerce-store';
import { useBrandingStore } from '@/lib/store/branding-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { productService } from '@/lib/supabase/services/products';
import { type ProductCategory } from '@/lib/supabase/services/categories';
import { loadCategories } from '@/lib/category-utils';
import { Footer } from '@/components/layout/footer';
import { Ticker } from '@/components/layout/ticker';
import { useVoiceAssistant } from '@/lib/hooks/use-voice-assistant';
import toast from 'react-hot-toast';

type SortOption = 'default' | 'price_asc' | 'price_desc' | 'name';
type ViewMode = 'grid' | 'list';

interface ShopProduct {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  originalPrice?: number;
  baseUnit: string;
  categoryId?: string;
  image?: string;
  images?: string[];
  description?: string;
  stock?: number;
}

function mapProduct(p: any): ShopProduct {
  const salePrice = Number(p.sale_price || p.unit_price || 0);
  const originalPrice = Number(p.unit_price || 0);
  return {
    id: p.id,
    name: p.name_en || p.name_ar,
    nameAr: p.name_ar,
    price: salePrice,
    originalPrice: originalPrice > salePrice ? originalPrice : undefined,
    baseUnit: p.unit || 'قطعة',
    categoryId: p.category_id,
    image: p.image_url || '/product-placeholder.svg',
    images: p.image_url ? [p.image_url] : [],
    description: p.description,
    stock: p.current_stock ?? 999,
  };
}

/* ───────────── Product Card ───────────── */
function ProductCard({ product, viewMode, onAdd, onOrderNow, isWishlisted, onToggleWishlist }: {
  product: ShopProduct;
  viewMode: ViewMode;
  onAdd: (p: ShopProduct) => void;
  onOrderNow: (p: ShopProduct) => void;
  isWishlisted: boolean;
  onToggleWishlist: (id: string) => void;
}) {
  const router = useRouter();
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const imageUrl = product.image || '/product-placeholder.svg';

  const { branding: cardBranding } = useBrandingStore();
  const isOutOfStock = (product.stock ?? 0) === 0;
  const lowStockLimit = cardBranding.lowStockThreshold || 5;
  const isLowStock = (cardBranding.lowStockEnabled !== false) && (product.stock ?? 0) > 0 && (product.stock ?? 0) <= lowStockLimit;
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discountPercent = hasDiscount ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100) : 0;

  if (viewMode === 'list') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden hover:shadow-md transition-all ${isOutOfStock ? 'opacity-60' : ''}`}>
        <div className="flex items-center">
          <div className="w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0 relative overflow-hidden cursor-pointer bg-gray-100 dark:bg-slate-800"
            onClick={() => router.push(`/shop/product/${product.id}`)}>
            {!imgLoaded && !imgError && <div className="absolute inset-0 bg-gray-200 dark:bg-slate-700 animate-pulse" />}
            {imageUrl ? (
              <img loading="lazy" src={imageUrl} alt={product.nameAr}
                className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImgLoaded(true)} onError={() => { setImgError(true); setImgLoaded(true); }} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <ImageIcon className="w-7 h-7 text-gray-300" />
              </div>
            )}
            {hasDiscount && (
              <span className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">-{discountPercent}%</span>
            )}
            {isOutOfStock && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="text-white text-xs font-black bg-red-500 px-2 py-1 rounded-lg">نفذ</span>
              </div>
            )}
            {!isOutOfStock && isLowStock && (
              <div className="absolute bottom-2 left-2 right-2">
                <div className="bg-orange-500/90 backdrop-blur-md text-white text-[9px] font-bold px-2 py-1 rounded-lg flex items-center justify-center gap-1 shadow-lg border border-orange-400/50 animate-pulse">
                  <Zap className="h-3 w-3 fill-white" />
                  متبقي {product.stock} فقط!
                </div>
              </div>
            )}
          </div>
          <div className="flex-1 p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <div className="cursor-pointer flex-1" onClick={() => router.push(`/shop/product/${product.id}`)}>
                <h3 className={`text-base sm:text-lg font-bold hover:text-emerald-600 transition-colors leading-snug ${isOutOfStock ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>{product.nameAr}</h3>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">{product.name}</p>
              </div>
              <button onClick={() => onToggleWishlist(product.id)}
                className="h-9 w-9 rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center hover:bg-red-50 transition-colors shrink-0 mr-3">
                <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div>
                <span className={`text-lg sm:text-xl font-black ${isOutOfStock ? 'text-gray-300' : 'text-emerald-600'}`}>{formatCurrency(product.price)}</span>
                {hasDiscount && <span className="text-sm text-gray-400 line-through mr-2">{formatCurrency(product.originalPrice!)}</span>}
                <span className="text-xs sm:text-sm text-gray-400 mr-1">/ {product.baseUnit}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { if (!isOutOfStock) onAdd(product); }} disabled={isOutOfStock}
                  className={`h-10 px-4 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 active:scale-[0.98] ${
                    isOutOfStock
                      ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                      : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm'
                  }`}>
                  <ShoppingCart className="h-4 w-4" />
                  <span>{isOutOfStock ? 'نفذ' : 'أضف للسلة'}</span>
                </button>
                <button onClick={() => { if (!isOutOfStock) onOrderNow(product); }} disabled={isOutOfStock}
                  className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all active:scale-[0.98] ${
                    isOutOfStock
                      ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                      : 'bg-gray-900 dark:bg-slate-700 text-white hover:bg-gray-800 dark:hover:bg-slate-600'
                  }`}>
                  <MessageCircle className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden group transition-all flex flex-col h-full ${isOutOfStock ? 'opacity-60' : 'hover:shadow-md hover:-translate-y-1'}`}>
      <div className="relative aspect-square overflow-hidden cursor-pointer bg-gray-100 dark:bg-slate-800 shrink-0"
        onClick={() => router.push(`/shop/product/${product.id}`)}>
        {!imgLoaded && !imgError && <div className="absolute inset-0 bg-gray-200 dark:bg-slate-700 animate-pulse" />}
        {imageUrl ? (
          <img loading="lazy" src={imageUrl} alt={product.nameAr}
            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-110 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)} onError={() => { setImgError(true); setImgLoaded(true); }} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageIcon className="w-10 h-10 text-gray-300 dark:text-slate-600" />
          </div>
        )}
        {hasDiscount && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-md">-{discountPercent}%</span>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-sm font-black bg-red-500 px-3 py-1 rounded-lg">نفذ من المخزن</span>
          </div>
        )}
        {!isOutOfStock && isLowStock && (
          <div className="absolute bottom-2 left-2 right-2">
            <div className="bg-orange-500/95 text-white text-[10px] font-bold px-2 py-1.5 rounded-lg flex items-center justify-center gap-1 shadow-lg border border-orange-400/50 animate-pulse">
              <Zap className="h-3 w-3 fill-white" />
              متبقي {product.stock} فقط في المخزن! أسرع بالطلب
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <button onClick={(e) => { e.stopPropagation(); onToggleWishlist(product.id); }}
          className="absolute top-2 left-2 h-9 w-9 rounded-full bg-white/95 dark:bg-slate-800/95 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white shadow-sm">
          <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
        </button>
      </div>

      <div className="p-3 flex flex-col flex-1">
        <h3 className={`text-xs sm:text-sm font-bold line-clamp-2 leading-snug cursor-pointer transition-colors mb-2 ${isOutOfStock ? 'text-gray-400 hover:text-gray-500' : 'text-gray-900 dark:text-white hover:text-emerald-600'}`}
          onClick={() => router.push(`/shop/product/${product.id}`)}>{product.nameAr}</h3>
        <div className="flex items-center gap-1.5 mb-2 mt-auto">
          <span className={`text-sm sm:text-base font-black ${isOutOfStock ? 'text-gray-300' : 'text-emerald-600 dark:text-emerald-500'}`}>{formatCurrency(product.price)}</span>
          {hasDiscount && <span className="text-[10px] text-gray-400 line-through">{formatCurrency(product.originalPrice!)}</span>}
        </div>
        <p className="text-[10px] text-gray-400 mb-2">{product.baseUnit === 'piece' ? 'قطعة' : product.baseUnit}</p>
        <div className="flex items-center gap-2 mt-auto pt-3 border-t border-gray-100 dark:border-slate-800">
          <button onClick={() => { if (!isOutOfStock) onAdd(product); }} disabled={isOutOfStock}
            className={`flex-1 h-10 rounded-xl text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm ${
              isOutOfStock
                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                : 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-[0.98]'
            }`}>
            <ShoppingCart className="h-4 w-4" />
            <span>أضف للسلة</span>
          </button>
          <button onClick={() => { if (!isOutOfStock) onOrderNow(product); }} disabled={isOutOfStock}
            className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all active:scale-[0.98] shadow-sm ${
              isOutOfStock
                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                : 'bg-gray-900 dark:bg-slate-700 text-white hover:bg-gray-800 dark:hover:bg-slate-600'
            }`}>
            <MessageCircle className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Offers Notification ───────────── */
function OffersNotification() {
  const { branding } = useBrandingStore();
  const [offer, setOffer] = useState<{ id: string; title: string; desc: string; user?: string } | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const pushOffers = branding.pushNotificationOffers || [];
    const defaultOffers = [
      { id: '1', title: 'عرض حصري 🌟', desc: 'خصم 20% على قسم اللحوم!' },
      { id: '2', title: 'تخفيضات نهاية الأسبوع 🔥', desc: 'شحن مجاني للطلبات فوق 500 جنيه' },
      { id: '3', title: 'عرض اليوم ⚡', desc: 'خصم 30% على الفواكه الطازجة' },
    ];

    // Use push notification offers from branding if available
    const offers = pushOffers.length > 0
      ? pushOffers.map((text, i) => {
          const parts = text.split(' ');
          const emoji = parts.find((p: string) => /[\u{1F300}-\u{1FAD6}]/u.test(p)) || '🎉';
          return { id: String(i), title: `${emoji} عرض خاص`, desc: text };
        })
      : defaultOffers;

    const showRandomOffer = () => {
      const randomOffer = offers[Math.floor(Math.random() * offers.length)];
      setOffer(randomOffer);
      setVisible(true);
      setTimeout(() => setVisible(false), 4000);
    };

    const interval = setInterval(() => {
      if (!visible) showRandomOffer();
    }, 10000);

    return () => clearInterval(interval);
  }, [visible, branding.pushNotificationOffers]);

  return (
    <AnimatePresence>
      {visible && offer && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-24 left-4 right-4 sm:bottom-4 sm:left-4 sm:right-auto sm:w-80 z-[100] pointer-events-none"
        >
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-gray-100 dark:border-slate-800 shadow-2xl rounded-2xl p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shrink-0">
              <Gift className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-gray-900 dark:text-white truncate">{offer.title}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{offer.desc}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───────────── Main Shop Page ───────────── */
export default function ShopPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addItem, getItemCount, items, clearCart, updateQuantity } = useCartStore();
  const { branding } = useBrandingStore();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { login } = useAuthStore();

   const [search, setSearch] = useState('');
   const [category, setCategory] = useState(searchParams.get('category') || 'all');
   const [sort, setSort] = useState<SortOption>('default');
  const [showFilters, setShowFilters] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [walletPhone, setWalletPhone] = useState('');
  const [cardPhone, setCardPhone] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [orderDone, setOrderDone] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', address: '' });
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; image?: string }[]>([]);

  const { data: queryData, isLoading: loadingProducts } = useQuery({
    queryKey: ['shop_data'],
    queryFn: async () => {
      const [prodRes, catRes] = await Promise.allSettled([
        productService.getAll({ is_active: true, limit: 2000 }),
        loadCategories(),
      ]);
      
      let newProducts: ShopProduct[] = [];
      let newCategories: { id: string; name: string; image?: string }[] = [];
      
      if (prodRes.status === 'fulfilled' && prodRes.value.data) {
        newProducts = prodRes.value.data.map(mapProduct);
      }
      if (catRes.status === 'fulfilled' && catRes.value) {
        newCategories = [
          { id: 'all', name: 'الكل', image: '/category-placeholder.svg' },
          ...catRes.value.map((c: ProductCategory) => ({ id: c.id, name: c.name_ar, image: c.image_url || '/category-placeholder.svg' }))
        ];
      }
      return { products: newProducts, categories: newCategories };
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  useEffect(() => {
    if (queryData) {
      setProducts(queryData.products);
      setCategories(queryData.categories);
    }
    if (searchParams.get('login') === 'true' && !isAuthenticated) {
      setShowAuthModal(true);
    }
  }, [queryData, searchParams, isAuthenticated]);
  
  // Map URL category parameter to actual category ID when categories are loaded
  useEffect(() => {
    if (categories.length > 0) {
      const param = searchParams.get('category');
      if (param && param !== 'all') {
        // Try to find by ID directly first
        const foundById = categories.find(c => c.id === param);
        if (foundById) {
          setCategory(foundById.id);
        } else {
          // Try to find by Arabic name
          const foundByArName = categories.find(c => c.name === param);
          if (foundByArName) {
            setCategory(foundByArName.id);
          } else {
            // Try to find by English name mapping
            const englishToArabic: Record<string, string> = {
              'beverages': 'المشروبات',
              'dairy': 'الألبان',
            };
            const arabicName = englishToArabic[param.toLowerCase()];
            if (arabicName) {
              const foundByMappedName = categories.find(c => c.name === arabicName);
              if (foundByMappedName) {
                setCategory(foundByMappedName.id);
              } else {
                setCategory('all');
              }
            } else {
              setCategory('all');
            }
          }
        }
      }
    }
  }, [categories, searchParams]);
  
  // Update URL when category changes to keep it in sync
  useEffect(() => {
    if (typeof window !== 'undefined' && categories.length > 0) {
      // Find category name by ID for URL
      const categoryName = category === 'all' 
        ? 'all' 
        : categories.find(c => c.id === category)?.name || 'all';
      
      const params = new URLSearchParams(window.location.search);
      params.set('category', categoryName);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [category, categories]);
  
  const filtered = useMemo(() => {
    let result = products;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(p => p.nameAr.includes(q) || p.name.toLowerCase().includes(q));
    }
    if (category !== 'all') {
      result = result.filter(p => p.categoryId === category);
    }
    if (sort === 'price_asc') result = [...result].sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') result = [...result].sort((a, b) => b.price - a.price);
    else if (sort === 'name') result = [...result].sort((a, b) => a.nameAr.localeCompare(b.nameAr));
    return result;
  }, [products, search, category, sort]);

  const cartCount = getItemCount();
  const cartTotal = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const handleAdd = useCallback((p: ShopProduct) => {
    addItem({ productId: p.id, name: p.name, nameAr: p.nameAr, price: p.price, quantity: 1, image: undefined, unit: p.baseUnit, maxQuantity: 99 });
    toast.success(`تمت إضافة ${p.nameAr}`);
  }, [addItem]);

  const handleOrderNow = useCallback((p: ShopProduct) => {
    addItem({ productId: p.id, name: p.name, nameAr: p.nameAr, price: p.price, quantity: 1, image: undefined, unit: p.baseUnit, maxQuantity: 99 });
    if (!isAuthenticated) {
      setShowAuthModal(true);
    } else {
      setShowCheckout(true);
    }
  }, [addItem, isAuthenticated]);

  const toggleWishlist = (id: string) => {
    setWishlist(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAuthLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) { toast.error('يرجى إدخال البريد وكلمة المرور'); return; }
    setAuthLoading(true);
    const r = await login(authEmail, authPassword);
    if (r.success && useAuthStore.getState().user?.role === 'customer') {
      toast.success('تم تسجيل الدخول');
      setShowAuthModal(false);
    } else {
      toast.error(r.error || 'بيانات الدخول غير صحيحة أو الحساب ليس حساب عميل');
    }
    setAuthLoading(false);
  };

  const handleAuthRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authName || !authEmail || !authPassword) { toast.error('يرجى ملء جميع الحقول'); return; }
    if (authPassword.length < 6) { toast.error('كلمة المرور 6 أحرف على الأقل'); return; }
    setAuthLoading(true);
    try {
      const res = await fetch('/api/manage-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', email: authEmail, password: authPassword, name: authName, phone: authPhone, role: 'customer' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إنشاء الحساب');
      const result = await login(authEmail, authPassword);
      if (result.success) {
        toast.success('تم إنشاء الحساب بنجاح!');
        setShowAuthModal(false);
      } else {
        toast.success('تم إنشاء الحساب! سجل دخولك الآن');
        setAuthTab('login');
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'فشل إنشاء الحساب');
    }
    setAuthLoading(false);
  };

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/shop`
        }
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error('فشل تسجيل الدخول باستخدام جوجل: ' + (err.message || ''));
      setAuthLoading(false);
    }
  };

  const handleOrder = () => {
    if (!customerInfo.name || !customerInfo.phone) { toast.error('يرجى إدخال الاسم ورقم الهاتف'); return; }
    const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const itemsText = items.map(i => `${i.nameAr} ×${i.quantity}`).join('\n');
    const msg = `🧾 *طلب جديد*\n👤 ${customerInfo.name}\n📞 ${customerInfo.phone}\n📍 ${customerInfo.address}\n━━━━━━━━━━\n${itemsText}\n━━━━━━━━━━\n💰 الإجمالي: ${formatCurrency(total)}\n💳 الدفع: ${paymentMethod === 'cod' ? 'الدفع عند الاستلام' : paymentMethod === 'card' ? 'بطاقة' : 'محفظة'}`;
    const waUrl = `https://wa.me/${(whatsappNumber || branding.whatsapp || '201000000000').replace(/^0/, '20').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
    clearCart();
    setOrderDone(true);
    toast.success('تم إرسال الطلب');
  };

  const { isListening, interimText, toggleListening, isSupported } = useVoiceAssistant({
    onSearch: (query) => {
      setSearch(query);
      toast.success(`جاري البحث عن: ${query}`, { duration: 3000 });
    },
    commands: [
      {
        keywords: ['عربيات', 'عربية', 'cart', 'السلة', 'سله'],
        action: () => {
          toast.success('جاري عرض السلة...', { duration: 3000 });
          setShowCart(true);
        },
        priority: 10,
      },
      {
        keywords: ['عروض', 'خصم', 'تخفيض'],
        action: () => {
          toast.success('جاري عرض العروض والخصومات...', { duration: 3000 });
          router.push('/offers');
        },
        priority: 10,
      },
    ],
  });

  const primaryColor = branding.primaryColor || '#22C55E';

  if (orderDone) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#020617] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full text-center shadow-lg border border-gray-100 dark:border-slate-800">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}
            className="h-20 w-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-emerald-600" />
          </motion.div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">تم إرسال الطلب!</h2>
          <p className="text-sm text-gray-500 mb-6">سيتم التواصل معك قريباً لتأكيد الطلب</p>
          <div className="space-y-2">
            <button onClick={() => router.push('/customer')}
              className="w-full h-12 rounded-2xl text-sm font-bold text-white shadow-sm hover:shadow-md transition-all" style={{ backgroundColor: primaryColor }}>
              متابعة الطلبات
            </button>
            <button onClick={() => router.push('/shop')}
              className="w-full h-11 rounded-2xl text-sm font-medium text-gray-500 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">
              العودة للمتجر
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const activeCategory = categories.find(c => c.id === category);

  const resetFilters = () => {
    setCategory('all');
    setSearch('');
    setSort('default');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617]" dir="rtl">

      <OffersNotification />
      {/* ───── Header (Sticky on mobile + desktop) ───── */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-950 border-b border-gray-100 dark:border-slate-800 shadow-sm">
        <div className="px-3 sm:px-4 lg:px-8 py-2.5 sm:py-3">
           <div className="flex items-center justify-between mb-2.5">
           <div className="flex items-center gap-2">
              <button onClick={() => router.push('/')}
                className="h-9 w-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <Home className="h-4 w-4 text-gray-900" />
              </button>
              {(branding.logo || '/logo.jpg') ? (
                <button onClick={() => router.push('/')}>
                  <img loading="lazy" src={branding.logo || '/logo.jpg'} className="h-9 w-9 rounded-lg object-contain block bg-white p-0.5 border border-gray-100" alt={branding.storeName} />
                </button>
              ) : (
                <button onClick={() => router.push('/')}
                  className="h-9 w-9 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: primaryColor }}>
                  <Store className="h-4 w-4 text-white" />
                </button>
              )}
          <div>
            <h1 className="text-sm sm:text-base font-black text-gray-900 dark:text-white cursor-pointer leading-tight" onClick={() => router.push('/')}>{branding.storeName || 'سوبر ماركت'}</h1>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 max-w-[150px] sm:max-w-xs truncate">{branding.slogan || 'تسوق أفضل المنتجات بأسعار منافسة'}</p>
          </div>
             </div>
              <div className="flex items-center gap-2">
                 {isAuthenticated ? (
                  <button onClick={() => {
                    if (user?.role === 'customer') {
                      router.push('/customer');
                    } else {
                      toast.error('سجل دخولك كعميل عشان تقدر تتسوق');
                      logout();
                      setShowAuthModal(true);
                    }
                  }}
                    className="h-9 w-9 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                    <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  </button>
                ) : (
                  <button onClick={() => setShowAuthModal(true)}
                    className="h-9 px-3 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> دخول
                  </button>
                )}
                <button onClick={() => { if (items.length === 0) { toast.error('السلة فارغة'); return; } setShowCart(true); }}
               className="h-9 w-9 rounded-xl text-white flex items-center justify-center relative shadow-sm" style={{ backgroundColor: primaryColor }}>
               <ShoppingCart className="h-4 w-4" />
               {cartCount > 0 && (
                 <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold ring-2 ring-white dark:ring-slate-950">
                   {cartCount}
                 </span>
               )}
             </button>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type="text" placeholder="ابحث عن منتج..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-3 pr-10 rounded-xl bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all" />
            </div>
            <button onClick={toggleListening}
              className={`h-10 w-10 rounded-xl border flex items-center justify-center transition-all relative ${isListening ? 'bg-red-500 text-white border-red-500 animate-pulse' : 'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-500'}`}>
              <Mic className="h-4 w-4" />
              {isListening && interimText && (
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-slate-700 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap max-w-[200px] truncate">
                  {interimText}
                </span>
              )}
            </button>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`h-10 px-3 rounded-xl border flex items-center gap-1.5 text-[13px] font-medium transition-all lg:hidden ${
                showFilters
                  ? 'text-white border-transparent'
                  : 'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300'
              }`}
              style={showFilters ? { backgroundColor: primaryColor } : {}}>
              <SlidersHorizontal className="h-4 w-4" />
              <span>فلتر</span>
            </button>
          </div>
        </div>

           {/* Mobile Filter Panel - Noon Style */}
           <AnimatePresence>
             {showFilters && (
               <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden lg:hidden">
                 <div className="max-w-7xl mx-auto px-3 sm:px-4 pb-3">
                   <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                     {categories.map((c) => (
                       <button key={c.id} onClick={() => setCategory(c.id)}
                         className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-all shadow-sm border ${
                           category === c.id
                             ? 'text-white border-transparent'
                             : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700'
                         }`}
                         style={category === c.id ? { backgroundColor: primaryColor } : {}}>
                         {c.image && (
                           <img loading="lazy" src={c.image} alt={c.name} className="w-5 h-5 rounded-md object-cover" />
                         )}
                         <span className="leading-none">{c.name}</span>
                         {c.id !== 'all' && (
                           <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                             category === c.id ? 'bg-white/25 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
                           }`}>
                             {products.filter(p => p.categoryId === c.id).length}
                           </span>
                         )}
                       </button>
                     ))}
                   </div>
                 </div>
                </motion.div>
              )}
             </AnimatePresence>
      </header>

      <Ticker />

      {/* ───── Content (Full-width on desktop like Noon/Amazon) ───── */}
      <div className="flex">
        {/* Desktop Sidebar Filter - Noon Style */}
        <div className="hidden lg:block w-60 shrink-0 sticky top-[120px] h-[calc(100vh-120px)] overflow-y-auto border-l border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-950">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-bold text-gray-900 dark:text-white">الأقسام</h3>
              <button onClick={() => setCategory('all')} className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium">عرض الكل</button>
            </div>
            <div className="space-y-0.5">
              {categories.map((c) => (
                <button key={c.id} onClick={() => setCategory(c.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] transition-all ${
                    category === c.id
                      ? 'text-white shadow-sm'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                  }`}
                  style={category === c.id ? { backgroundColor: primaryColor } : {}}>
                  {c.image ? (
                    <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-gray-100 dark:bg-slate-700">
                      <img loading="lazy" src={c.image} alt={c.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-800 shrink-0" />
                  )}
                  <span className="font-medium text-right leading-none">{c.name}</span>
                  {category === c.id && (
                    <span className="mr-auto text-[10px] opacity-80 font-medium">
                      {c.id === 'all' ? products.length : products.filter(p => p.categoryId === c.id).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">الترتيب</h3>
              <div className="space-y-1">
                {[
                  { value: 'default', label: 'الأحدث' },
                  { value: 'price_asc', label: 'الأقل سعراً' },
                  { value: 'price_desc', label: 'الأعلى سعراً' },
                  { value: 'name', label: 'أبجدياً' },
                ].map((s) => (
                  <button key={s.value} onClick={() => setSort(s.value as SortOption)}
                    className={`w-full text-right px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      sort === s.value ? 'text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                    style={sort === s.value ? { backgroundColor: primaryColor } : {}}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* View Mode */}
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">العرض</h3>
              <div className="flex gap-2 bg-gray-100 dark:bg-slate-800 rounded-xl p-1">
                <button onClick={() => setViewMode('grid')}
                  className={`flex-1 h-9 rounded-lg flex items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                  <Grid className="h-4 w-4" />
                </button>
                <button onClick={() => setViewMode('list')}
                  className={`flex-1 h-9 rounded-lg flex items-center justify-center transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Products Area - Full width on desktop */}
        <div className="flex-1 p-3 sm:p-4 lg:p-6">
          {/* Mobile Sort & View Bar */}
          <div className="flex items-center justify-between mb-3 lg:hidden">
            <p className="text-xs text-gray-400">{filtered.length} منتج</p>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5">
                <button onClick={() => setViewMode('grid')}
                  className={`h-7 w-7 rounded-md flex items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                  <Grid className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setViewMode('list')}
                  className={`h-7 w-7 rounded-md flex items-center justify-center transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
              <select value={sort} onChange={(e) => setSort(e.target.value as SortOption)}
                className="h-8 px-2 rounded-lg bg-gray-100 dark:bg-slate-800 border-0 text-xs text-gray-600 dark:text-gray-300 focus:outline-none">
                <option value="default">الأحدث</option>
                <option value="price_asc">الأقل سعراً</option>
                <option value="price_desc">الأعلى سعراً</option>
                <option value="name">أبجدياً</option>
              </select>
            </div>
          </div>

          {loadingProducts ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} /></div>
          ) : (
            <>
              <div className={viewMode === 'grid'
                ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 lg:gap-4'
                : 'grid grid-cols-1 gap-3'
              }>
                {filtered.map((p) => (
                  <ProductCard key={p.id} product={p} viewMode={viewMode} onAdd={handleAdd} onOrderNow={handleOrderNow}
                    isWishlisted={wishlist.has(p.id)} onToggleWishlist={toggleWishlist} />
                ))}
              </div>
              {filtered.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center shadow-sm border border-gray-100 dark:border-slate-800">
                  <div className="text-4xl mb-3">🔍</div>
                  <p className="text-base font-bold text-gray-900 dark:text-white mb-1">لا توجد منتجات</p>
                  <p className="text-sm text-gray-400">جرب البحث بكلمات مختلفة أو اختر قسم آخر</p>
                  <button onClick={() => { setSearch(''); setCategory('all'); }}
                    className="mt-4 px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: primaryColor }}>
                    إعادة تعيين الفلتر
                  </button>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ───── Auth Modal ───── */}
      <AnimatePresence>
        {showAuthModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]" onClick={() => setShowAuthModal(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none md:hidden">
              <div className="w-full max-w-md bg-white dark:bg-slate-950 rounded-3xl shadow-2xl overflow-hidden pointer-events-auto max-h-[90vh] overflow-y-auto" dir="rtl">
                <div className="flex justify-center pt-3 pb-1"><div className="h-1 w-12 rounded-full bg-gray-300 dark:bg-slate-600" /></div>
                <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-gray-900 dark:text-white">أكمل الطلب</h3>
                    <p className="text-xs text-gray-400 mt-0.5">سجل دخولك أو أنشئ حساب جديد</p>
                  </div>
                  <button onClick={() => setShowAuthModal(false)} className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                    <X className="h-4 w-4 text-gray-500" />
                  </button>
                </div>
                <div className="flex border-b border-gray-100 dark:border-slate-800">
                  <button onClick={() => setAuthTab('login')}
                    className={`flex-1 py-3 text-sm font-bold transition-all ${authTab === 'login' ? 'border-b-2' : 'text-gray-400'}`}
                    style={authTab === 'login' ? { borderColor: primaryColor, color: primaryColor } : {}}>
                    تسجيل الدخول
                  </button>
                  <button onClick={() => setAuthTab('register')}
                    className={`flex-1 py-3 text-sm font-bold transition-all ${authTab === 'register' ? 'border-b-2' : 'text-gray-400'}`}
                    style={authTab === 'register' ? { borderColor: primaryColor, color: primaryColor } : {}}>
                    حساب جديد
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  {authTab === 'login' ? (
                    <form onSubmit={handleAuthLogin} className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">البريد الإلكتروني</label>
                        <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} dir="ltr" placeholder="email@example.com"
                          className="w-full h-11 px-4 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">كلمة المرور</label>
                        <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} dir="ltr" placeholder="••••••••"
                          className="w-full h-11 px-4 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                      </div>
                      <button type="submit" disabled={authLoading}
                        className="w-full h-11 rounded-xl text-white text-sm font-bold shadow-sm disabled:opacity-50" style={{ backgroundColor: primaryColor }}>
                        {authLoading ? 'جاري الدخول...' : 'تسجيل الدخول والمتابعة'}
                      </button>
                      <div className="relative flex py-1 items-center">
                        <div className="flex-grow border-t border-gray-200 dark:border-slate-800"></div>
                        <span className="flex-shrink mx-3 text-[10px] text-gray-400 font-medium">أو تابع باستخدام</span>
                        <div className="flex-grow border-t border-gray-200 dark:border-slate-800"></div>
                      </div>
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={authLoading}
                        className="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-200 text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-850 transition-colors shadow-sm disabled:opacity-50"
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                          <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.53 14.99 1 12 1 7.35 1 3.37 3.68 1.4 7.6l3.86 3C6.18 7.69 8.86 5.04 12 5.04z" />
                          <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.28 1.48-1.12 2.74-2.38 3.58l3.7 2.87c2.16-1.99 3.41-4.92 3.41-8.6z" />
                          <path fill="#FBBC05" d="M5.26 14.4c-.25-.76-.39-1.57-.39-2.4s.14-1.64.39-2.4L1.4 7.6C.51 9.38 0 11.38 0 13.5s.51 4.12 1.4 5.9l3.86-3z" />
                          <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.7-2.87c-1.03.69-2.35 1.1-4.26 1.1-3.14 0-5.82-2.65-6.74-5.56L1.4 15.74C3.37 20.32 7.35 23 12 23z" />
                        </svg>
                        تسجيل الدخول السريع بجوجل
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleAuthRegister} className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">الاسم</label>
                        <input type="text" value={authName} onChange={(e) => setAuthName(e.target.value)} placeholder="الاسم الكامل"
                          className="w-full h-11 px-4 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">البريد الإلكتروني</label>
                        <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} dir="ltr" placeholder="email@example.com"
                          className="w-full h-11 px-4 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">رقم الهاتف</label>
                        <input type="tel" value={authPhone} onChange={(e) => setAuthPhone(e.target.value)} dir="ltr" placeholder="01XXXXXXXXX"
                          className="w-full h-11 px-4 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">كلمة المرور</label>
                        <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} dir="ltr" placeholder="6 أحرف على الأقل"
                          className="w-full h-11 px-4 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                      </div>
                      <button type="submit" disabled={authLoading}
                        className="w-full h-11 rounded-xl text-white text-sm font-bold shadow-sm disabled:opacity-50" style={{ backgroundColor: primaryColor }}>
                        {authLoading ? 'جاري الإنشاء...' : 'إنشاء حساب والمتابعة'}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Desktop - bottom sheet */}
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="hidden md:block fixed bottom-0 left-0 right-0 z-[60] bg-white dark:bg-slate-950 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto max-w-lg mx-auto" dir="rtl">
              <div className="flex justify-center pt-3 pb-1"><div className="h-1 w-12 rounded-full bg-gray-300 dark:bg-slate-600" /></div>
              <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-800">
                <h3 className="text-base font-black text-gray-900 dark:text-white">أكمل الطلب</h3>
                <p className="text-xs text-gray-400 mt-0.5">سجل دخولك أو أنشئ حساب جديد</p>
              </div>
              <div className="flex border-b border-gray-100 dark:border-slate-800">
                <button onClick={() => setAuthTab('login')}
                  className={`flex-1 py-3.5 text-sm font-bold transition-all ${authTab === 'login' ? 'border-b-2' : 'text-gray-400'}`}
                  style={authTab === 'login' ? { borderColor: primaryColor, color: primaryColor } : {}}>
                  تسجيل الدخول
                </button>
                <button onClick={() => setAuthTab('register')}
                  className={`flex-1 py-3.5 text-sm font-bold transition-all ${authTab === 'register' ? 'border-b-2' : 'text-gray-400'}`}
                  style={authTab === 'register' ? { borderColor: primaryColor, color: primaryColor } : {}}>
                  حساب جديد
                </button>
              </div>
              <div className="p-5">
                {authTab === 'login' ? (
                  <form onSubmit={handleAuthLogin} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">البريد الإلكتروني</label>
                      <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} dir="ltr" placeholder="email@example.com"
                        className="w-full h-12 px-4 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">كلمة المرور</label>
                      <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} dir="ltr" placeholder="••••••••"
                        className="w-full h-12 px-4 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                    </div>
                    <button type="submit" disabled={authLoading}
                      className="w-full h-12 rounded-xl text-white text-sm font-bold shadow-sm disabled:opacity-50" style={{ backgroundColor: primaryColor }}>
                      {authLoading ? 'جاري الدخول...' : 'تسجيل الدخول والمتابعة'}
                    </button>
                    <div className="relative flex py-1 items-center">
                      <div className="flex-grow border-t border-gray-200 dark:border-slate-800"></div>
                      <span className="flex-shrink mx-3 text-[10px] text-gray-400 font-medium">أو تابع باستخدام</span>
                      <div className="flex-grow border-t border-gray-200 dark:border-slate-800"></div>
                    </div>
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={authLoading}
                      className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-700 dark:text-gray-200 text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-850 transition-colors shadow-sm disabled:opacity-50"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.53 14.99 1 12 1 7.35 1 3.37 3.68 1.4 7.6l3.86 3C6.18 7.69 8.86 5.04 12 5.04z" />
                        <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.28 1.48-1.12 2.74-2.38 3.58l3.7 2.87c2.16-1.99 3.41-4.92 3.41-8.6z" />
                        <path fill="#FBBC05" d="M5.26 14.4c-.25-.76-.39-1.57-.39-2.4s.14-1.64.39-2.4L1.4 7.6C.51 9.38 0 11.38 0 13.5s.51 4.12 1.4 5.9l3.86-3z" />
                        <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.7-2.87c-1.03.69-2.35 1.1-4.26 1.1-3.14 0-5.82-2.65-6.74-5.56L1.4 15.74C3.37 20.32 7.35 23 12 23z" />
                      </svg>
                      تسجيل الدخول السريع بجوجل
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleAuthRegister} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">الاسم</label>
                      <input type="text" value={authName} onChange={(e) => setAuthName(e.target.value)} placeholder="الاسم الكامل"
                        className="w-full h-12 px-4 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">البريد الإلكتروني</label>
                      <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} dir="ltr" placeholder="email@example.com"
                        className="w-full h-12 px-4 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">رقم الهاتف</label>
                      <input type="tel" value={authPhone} onChange={(e) => setAuthPhone(e.target.value)} dir="ltr" placeholder="01XXXXXXXXX"
                        className="w-full h-12 px-4 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">كلمة المرور</label>
                      <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} dir="ltr" placeholder="6 أحرف على الأقل"
                        className="w-full h-12 px-4 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
                    </div>
                    <button type="submit" disabled={authLoading}
                      className="w-full h-12 rounded-xl text-white text-sm font-bold shadow-sm disabled:opacity-50" style={{ backgroundColor: primaryColor }}>
                      {authLoading ? 'جاري الإنشاء...' : 'إنشاء حساب والمتابعة'}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ───── Cart Sheet ───── */}
      <AnimatePresence>
        {showCart && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setShowCart(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-950 rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col" dir="rtl">
              <div className="flex justify-center pt-3 pb-1"><div className="h-1 w-12 rounded-full bg-gray-300 dark:bg-slate-600" /></div>
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                    <ShoppingCart className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">سلة التسوق</h3>
                    <p className="text-[10px] text-gray-400">{cartCount} منتج</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {items.length > 0 && (
                    <button onClick={clearCart} className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1">تفريغ</button>
                  )}
                  <button onClick={() => setShowCart(false)} className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                    <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-slate-900 p-3 space-y-2">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                      <ShoppingCart className="h-6 w-6 text-gray-300 dark:text-slate-600" />
                    </div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">السلة فارغة</p>
                    <p className="text-xs text-gray-400">أضف منتجات للبدء</p>
                  </div>
                ) : items.map((item) => (
                  <motion.div layout key={item.productId}
                    className="bg-white dark:bg-slate-950 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                    <div className="flex gap-3">
                      <div className="h-16 w-16 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        <span className="text-2xl">🛒</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug">{item.nameAr}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{item.unit === 'piece' ? 'قطعة' : item.unit}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-base font-black text-emerald-600 tabular-nums">{formatCurrency(item.price * item.quantity)}</span>
                          {item.quantity > 1 && (
                            <span className="text-[10px] text-gray-400 tabular-nums">({formatCurrency(item.price)} / واحد)</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end justify-between shrink-0">
                        <div className="flex items-center gap-0 bg-gray-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                          <button onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="h-8 w-8 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                            <Minus className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
                          </button>
                          <span className="min-w-[24px] text-center text-sm font-bold text-gray-900 dark:text-white tabular-nums">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="h-8 w-8 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
                            <Plus className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              {items.length > 0 && (
                <div className="border-t border-gray-100 dark:border-slate-800 px-4 py-4 space-y-3 shrink-0 bg-white dark:bg-slate-950">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">الإجمالي</span>
                    <span className="text-xl font-black text-emerald-600 tabular-nums">{formatCurrency(cartTotal)}</span>
                  </div>
                  <button onClick={() => {
                    if (!isAuthenticated) { setShowCart(false); setShowAuthModal(true); }
                    else { setShowCart(false); setShowCheckout(true); }
                  }}
                    className="w-full h-12 rounded-xl text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all"
                    style={{ backgroundColor: primaryColor }}>
                    تأكيد الطلب
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ───── Checkout ───── */}
      <AnimatePresence>
        {showCheckout && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setShowCheckout(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-950 rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
              <div className="flex justify-center pt-3 pb-1"><div className="h-1 w-12 rounded-full bg-gray-300 dark:bg-slate-600" /></div>
              <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 shrink-0">
                <h3 className="text-base font-black text-gray-900 dark:text-white">تأكيد الطلب</h3>
              </div>
              <div className="p-4 space-y-4">
                {/* Customer Info */}
                <div className="space-y-3">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">بيانات العميل</p>
                  <input type="text" placeholder="الاسم كامل" value={customerInfo.name} onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    className="w-full h-12 px-4 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 placeholder:text-gray-400 dark:placeholder:text-slate-600" />
                  <input type="tel" placeholder="رقم الهاتف" value={customerInfo.phone} onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                    className="w-full h-12 px-4 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 placeholder:text-gray-400 dark:placeholder:text-slate-600" dir="ltr" />
                  <input type="text" placeholder="العنوان بالتفصيل" value={customerInfo.address} onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                    className="w-full h-12 px-4 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 placeholder:text-gray-400 dark:placeholder:text-slate-600" />
                </div>

                {/* Payment Method */}
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">طريقة الدفع</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'cod', label: 'عند الاستلام', icon: Wallet },
                      { id: 'card', label: 'بطاقة', icon: CreditCard },
                      { id: 'wallet', label: 'محفظة', icon: MessageCircle },
                    ].map(({ id, label, icon: Icon }) => (
                        <button key={id} onClick={() => setPaymentMethod(id as any)}
                          className={`p-3 rounded-xl border-2 text-center transition-all ${
                            paymentMethod === id
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                              : 'border-gray-200 dark:border-slate-700 text-gray-400 hover:border-gray-300 dark:hover:border-slate-600'
                          }`}>
                          <Icon className="h-5 w-5 mx-auto mb-1" style={paymentMethod === id ? { color: primaryColor } : {}} />
                          <span className="text-xs font-medium text-gray-900 dark:text-white">{label}</span>
                        </button>
                      ))}
                    </div>
                    {paymentMethod === 'wallet' && (
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">رقم المحفظة (فودافون كاش، إلخ)</label>
                        <input type="tel" placeholder="01XXXXXXXXX" value={walletPhone} onChange={(e) => setWalletPhone(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:border-emerald-500" dir="ltr" />
                      </div>
                    )}
                    {paymentMethod === 'card' && (
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">رقم الهاتف المسجل بالبطاقة</label>
                        <input type="tel" placeholder="01XXXXXXXXX" value={cardPhone} onChange={(e) => setCardPhone(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm focus:outline-none focus:border-emerald-500" dir="ltr" />
                      </div>
                    )}
                  </div>

                {/* Order Summary */}
                <div className="bg-gray-50 dark:bg-slate-900 rounded-xl p-4 space-y-2">
                  <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">ملخص الطلب</p>
                  {items.map((item) => (
                    <div key={item.productId} className="flex justify-between text-sm py-1">
                      <span className="text-gray-600 dark:text-gray-400 line-clamp-1 flex-1">{item.nameAr} <span className="text-xs text-gray-400">×{item.quantity}</span></span>
                      <span className="font-bold text-gray-900 dark:text-white tabular-nums shrink-0 mr-2">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-3 border-t border-gray-200 dark:border-slate-700 mt-2">
                    <span className="text-base font-black text-gray-900 dark:text-white">الإجمالي</span>
                    <span className="text-xl font-black text-emerald-600 tabular-nums">{formatCurrency(cartTotal)}</span>
                  </div>
                </div>

                {/* Submit */}
                <button onClick={handleOrder}
                  className="w-full h-12 rounded-xl text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                  style={{ backgroundColor: primaryColor }}>
                  <MessageCircle className="h-5 w-5" /> تأكيد الطلب
                </button>
                <button onClick={() => { setShowCheckout(false); setShowCart(true); }}
                  className="w-full h-10 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center justify-center gap-1 transition-colors">
                  <ChevronRight className="h-4 w-4" /> رجوع للسلة
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ───── Professional Footer ───── */}
      <Footer />

      {/* ───── Floating Bottom Nav ───── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-gray-100/50 dark:border-slate-800/50 shadow-lg lg:hidden">
        <div className="max-w-lg mx-auto flex justify-around py-2">
          <Link href="/" className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-gray-400 dark:text-gray-500 transition-colors hover:text-gray-900 dark:hover:text-white">
            <Home className="h-5 w-5" />
            <span className="text-[10px] font-medium">الرئيسية</span>
          </Link>
          <Link href="/offers" className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-gray-400 dark:text-gray-500 transition-colors hover:text-gray-900 dark:hover:text-white">
            <Percent className="h-5 w-5" />
            <span className="text-[10px] font-medium">العروض</span>
          </Link>
          <Link href="/favorites" className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-gray-400 dark:text-gray-500 transition-colors hover:text-gray-900 dark:hover:text-white relative">
            <Heart className="h-5 w-5" />
            <span className="text-[10px] font-medium">المفضلة</span>
            {wishlist.size > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center font-bold">
                {wishlist.size}
              </span>
            )}
          </Link>
          <Link href="/orders" className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-gray-400 dark:text-gray-500 transition-colors hover:text-gray-900 dark:hover:text-white">
            <Truck className="h-5 w-5" />
            <span className="text-[10px] font-medium">طلباتي</span>
          </Link>
          {isAuthenticated ? (
            <button onClick={() => {
              if (user?.role === 'customer') {
                router.push('/customer');
              } else {
                toast.error('سجل دخولك كعميل عشان تقدر تتسوق');
                logout();
                setShowAuthModal(true);
              }
            }} className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-gray-400 dark:text-gray-500 transition-colors hover:text-gray-900 dark:hover:text-white">
              <User className="h-5 w-5" />
              <span className="text-[10px] font-medium">حسابي</span>
            </button>
          ) : (
            <button onClick={() => setShowAuthModal(true)} className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-gray-400 dark:text-gray-500 transition-colors hover:text-gray-900 dark:hover:text-white">
              <User className="h-5 w-5" />
              <span className="text-[10px] font-medium">دخول</span>
            </button>
          )}
        </div>
      </div>
     </div>
   );
}

