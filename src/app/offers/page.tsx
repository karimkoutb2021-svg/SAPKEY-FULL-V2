'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Percent, Clock, ShoppingBag, Loader2, Image as ImageIcon, Plus, Heart, Home, ShoppingCart, Package, Truck } from 'lucide-react';
import { useBrandingStore } from '@/lib/store/branding-store';
import { useCartStore } from '@/lib/store/ecommerce-store';
import { productService } from '@/lib/supabase/services/products';
import { createClient } from '@/lib/supabase/client';
import { CATEGORY_KEYS, findCategoryId, loadCategories } from '@/lib/category-utils';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import { CartDrawer } from '@/components/ecommerce/cart-drawer';

interface OfferProduct {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  originalPrice: number;
  discountPercent: number;
  baseUnit: string;
  categoryId?: string;
  image?: string;
  images?: string[];
  description?: string;
}

function mapOfferProduct(p: any): OfferProduct | null {
  const originalPrice = Number(p.unit_price || 0);
  const salePrice = Number(p.sale_price || 0);
  if (!salePrice || salePrice >= originalPrice) return null;
  return {
    id: p.id,
    name: p.name_en || p.name_ar,
    nameAr: p.name_ar,
    price: salePrice,
    originalPrice,
    discountPercent: Math.round(((originalPrice - salePrice) / originalPrice) * 100),
    baseUnit: p.unit || 'قطعة',
    categoryId: p.category_id,
    image: p.image_url || '/product-placeholder.svg',
    images: p.image_url ? [p.image_url] : [],
    description: p.description,
  };
}

function OfferCard({ product }: { product: OfferProduct }) {
  const router = useRouter();
  const { addItem } = useCartStore();
  const { branding } = useBrandingStore();
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const imageUrl = product.image || '/product-placeholder.svg';
  const primaryColor = branding.primaryColor || '#22C55E';

  const handleAdd = () => {
    addItem({
      productId: product.id,
      name: product.name,
      nameAr: product.nameAr,
      price: product.price,
      quantity: 1,
      image: undefined,
      unit: product.baseUnit,
      maxQuantity: 99,
    });
    toast.success(`تمت إضافة ${product.nameAr}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden group hover:shadow-md transition-all"
    >
      <div className="relative aspect-square overflow-hidden cursor-pointer bg-gray-100 dark:bg-slate-800"
        onClick={() => router.push(`/shop/product/${product.id}`)}>
        {/* Discount Badge */}
        <div className="absolute top-3 right-3 z-10 bg-red-500 text-white text-xs font-black px-2.5 py-1 rounded-lg shadow-md">
          -{product.discountPercent}%
        </div>

        {!imgLoaded && !imgError && <div className="absolute inset-0 bg-gray-200 dark:bg-slate-700 animate-pulse" />}
        {imageUrl ? (
          <img src={imageUrl} alt={product.nameAr}
            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-110 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)} onError={() => setImgError(true)} loading="lazy" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-gray-300 dark:text-slate-600" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      <div className="p-3">
        <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white line-clamp-2 leading-tight cursor-pointer hover:text-emerald-600 transition-colors mb-2"
          onClick={() => router.push(`/shop/product/${product.id}`)}>
          {product.nameAr}
        </h3>

        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-black" style={{ color: primaryColor }}>
            {formatCurrency(product.price)}
          </span>
          <span className="text-xs text-gray-400 line-through">
            {formatCurrency(product.originalPrice)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-400">/ {product.baseUnit}</span>
          <button onClick={handleAdd}
            className="h-8 w-8 rounded-lg text-white flex items-center justify-center hover:opacity-90 transition-all shadow-sm active:scale-90"
            style={{ backgroundColor: primaryColor }}>
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function OffersPage() {
  const router = useRouter();
  const { branding } = useBrandingStore();
  const [offers, setOffers] = useState<OfferProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const primaryColor = branding.primaryColor || '#22C55E';
  const cartItems = useCartStore((s) => s.items);
  const cartItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    async function loadOffers() {
      try {
        const [res, cats] = await Promise.allSettled([
          productService.getAll({ is_active: true, limit: 200 }),
          loadCategories(),
        ]);
        if (res.status === 'fulfilled' && res.value.data) {
          const offerProducts = res.value.data
            .map(mapOfferProduct)
            .filter((p): p is OfferProduct => p !== null)
            .sort((a, b) => b.discountPercent - a.discountPercent);
          setOffers(offerProducts);
        }
        if (cats.status === 'fulfilled') {
          setCategories(cats.value);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadOffers();
    const supabase = createClient();
    const channel = supabase.channel('offers-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => { loadOffers(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const totalSavings = offers.reduce((sum, o) => sum + (o.originalPrice - o.price), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#020617] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-b border-gray-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-3 h-12 flex items-center justify-between">
          <button onClick={() => router.back()} className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
            <ArrowLeft className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </button>
          <span className="text-sm font-black text-gray-900 dark:text-white">العروض والتخفيضات</span>
          <button onClick={() => setShowCart(true)} className="relative h-8 w-8 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
            <ShoppingBag className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                {cartItemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4">
        {/* Stats Banner */}
        <div className="bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 rounded-2xl p-4 sm:p-6 text-white mb-4 sm:mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Percent className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black">عروض حصرية</h2>
              <p className="text-xs sm:text-sm text-white/80">خصومات على منتجات مختارة</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/15 rounded-xl p-3 text-center backdrop-blur-sm">
              <p className="text-xl sm:text-2xl font-black">{offers.length}</p>
              <p className="text-[10px] sm:text-xs text-white/70">عرض متاح</p>
            </div>
            <div className="bg-white/15 rounded-xl p-3 text-center backdrop-blur-sm">
              <p className="text-xl sm:text-2xl font-black">{offers.length > 0 ? Math.max(...offers.map(o => o.discountPercent)) : 0}%</p>
              <p className="text-[10px] sm:text-xs text-white/70">أعلى خصم</p>
            </div>
            <div className="bg-white/15 rounded-xl p-3 text-center backdrop-blur-sm">
              <p className="text-xl sm:text-2xl font-black">{formatCurrency(totalSavings)}</p>
              <p className="text-[10px] sm:text-xs text-white/70">إجمالي التوفير</p>
            </div>
          </div>
        </div>

        {/* Offers Grid */}
        {offers.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {offers.map((offer) => (
              <OfferCard key={offer.id} product={offer} />
            ))}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center shadow-sm border border-gray-100 dark:border-slate-800">
            <div className="text-5xl mb-4">🏷️</div>
            <p className="text-base font-bold text-gray-900 dark:text-white mb-1">لا توجد عروض حالياً</p>
            <p className="text-sm text-gray-400 mb-4">تابعنا للحصول على أحدث العروض والخصومات</p>
            <button onClick={() => router.push('/shop')}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: primaryColor }}>
              تسوق الآن
            </button>
          </motion.div>
        )}
      </div>

       {/* Bottom Nav */}
       <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-gray-100/50 dark:border-slate-800/50 shadow-lg sm:hidden">
         <div className="max-w-lg mx-auto flex justify-around py-2">
           {[
             { icon: Home, label: 'الرئيسية', action: () => router.push('/') },
             { icon: ShoppingCart, label: 'المشروبات', action: () => router.push(`/shop?category=${findCategoryId(CATEGORY_KEYS.beverages, categories) || 'all'}`) },
             { icon: Package, label: 'الألبان', action: () => router.push(`/shop?category=${findCategoryId(CATEGORY_KEYS.dairy, categories) || 'all'}`) },
             { icon: Percent, label: 'العروض', active: true, action: () => {} },
             { icon: Heart, label: 'المفضلة', action: () => router.push('/favorites') },
             { icon: Truck, label: 'طلباتي', action: () => router.push('/orders') },
             { icon: ShoppingCart, label: 'عربة التسوق', action: () => setShowCart(true) },
           ].map(({ icon: Icon, label, active, action }) => (
             <button key={label} onClick={action}
               className={`flex flex-col items-center gap-0.5 px-3 py-1.5 relative transition-all ${active ? 'font-bold' : 'text-gray-400 dark:text-gray-500'}`}
               style={active ? { color: primaryColor } : {}}>
               <Icon className="h-5 w-5" />
               <span className="text-[9px] font-medium">{label}</span>
             </button>
           ))}
         </div>
       </div>

       <CartDrawer open={showCart} onClose={() => setShowCart(false)} />
    </div>
  );
}
