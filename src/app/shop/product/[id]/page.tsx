'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ShoppingCart, Heart, Star, Share2, Minus, Plus,
  Truck, Shield, RotateCcw, X, Loader2,
  CheckCircle, MessageCircle, Sparkles, ChevronLeft, ChevronRight
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { SAMPLE_PRODUCTS_FULL } from '@/lib/units';
import { useCartStore } from '@/lib/store/ecommerce-store';
import { useBrandingStore } from '@/lib/store/branding-store';
import { getCategoryGradient } from '@/lib/product-images';
import { productService } from '@/lib/supabase/services/products';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

const supabase = createClient();

interface DetailProduct {
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

function mapSupabaseProduct(p: any): DetailProduct {
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
    images: [],
    description: p.description,
    stock: p.current_stock ?? 999,
  };
}

function FrequentlyBoughtTogether({
  mainProduct,
  relatedProducts,
  primaryColor,
}: {
  mainProduct: DetailProduct;
  relatedProducts: DetailProduct[];
  primaryColor: string;
}) {
  const { addItem } = useCartStore();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(relatedProducts.slice(0, 3).map((p) => p.id))
  );
  const bundleItems = relatedProducts.slice(0, 3);

  const toggleProduct = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedBundle = bundleItems.filter((p) => selectedIds.has(p.id));
  const allSelected = [mainProduct, ...selectedBundle];
  const totalPrice = allSelected.reduce((sum, p) => sum + p.price, 0);
  const bundleDiscount = allSelected.length > 1 ? Math.round(totalPrice * 0.05) : 0;
  const finalPrice = totalPrice - bundleDiscount;

  const addBundleToCart = () => {
    allSelected.forEach((p) => {
      addItem({
        productId: p.id,
        name: p.name,
        nameAr: p.nameAr,
        price: p.price,
        quantity: 1,
        image: undefined,
        unit: p.baseUnit,
        maxQuantity: 99,
      });
    });
    toast.success(`تمت إضافة ${allSelected.length} منتجات للسلة`);
  };

  if (bundleItems.length === 0) return null;

  return (
    <div className="mt-8 sm:mt-12 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
      <div className="px-5 sm:px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/20">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-sm">
            <ShoppingCart className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-lg font-black text-gray-900 dark:text-white">يُشترى معاً غالباً</h3>
          <span className="text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full mr-auto shadow-sm">وفر 5%</span>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
          {/* Horizontal Images Row */}
          <div className="flex items-center gap-3 md:gap-4 overflow-x-auto pb-4 md:pb-0" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            <div className="shrink-0 relative">
               <img src={mainProduct.image} alt={mainProduct.nameAr} className="w-24 h-24 md:w-28 md:h-28 rounded-2xl object-cover border-2 border-emerald-500 shadow-md bg-white dark:bg-slate-800" />
               <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm"><CheckCircle className="h-3.5 w-3.5 text-white"/></div>
            </div>
            
            {bundleItems.map((p) => {
              const isSelected = selectedIds.has(p.id);
              return (
                <div key={p.id} className="shrink-0 flex items-center gap-3 md:gap-4">
                  <Plus className="h-5 w-5 text-gray-300 dark:text-slate-600 shrink-0" />
                  <button onClick={() => toggleProduct(p.id)} className="relative transition-all active:scale-95 group text-right">
                    <img src={p.image} alt={p.nameAr} className={`w-24 h-24 md:w-28 md:h-28 rounded-2xl object-cover border-2 transition-all shadow-sm bg-white dark:bg-slate-800 ${isSelected ? 'border-emerald-500 shadow-md' : 'border-gray-200 dark:border-slate-700 opacity-70 group-hover:opacity-100'}`} />
                    <div className={`absolute -top-2 -right-2 h-6 w-6 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center transition-all shadow-sm ${isSelected ? 'bg-emerald-500' : 'bg-gray-100 dark:bg-slate-700'}`}>
                       {isSelected && <CheckCircle className="h-3.5 w-3.5 text-white"/>}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Pricing & Add Box */}
          <div className="md:mr-auto md:border-r md:border-gray-100 dark:md:border-slate-800 md:pr-8 flex flex-col md:min-w-[220px]">
            <span className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">إجمالي ({allSelected.length} منتجات)</span>
            <div className="flex items-end gap-2 mb-1">
              <span className="text-3xl font-black text-emerald-600 tabular-nums">{formatCurrency(finalPrice)}</span>
              {bundleDiscount > 0 && <span className="text-sm font-bold text-gray-400 line-through tabular-nums mb-1">{formatCurrency(totalPrice)}</span>}
            </div>
            {bundleDiscount > 0 && <span className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-lg w-fit mb-3">وفرت {formatCurrency(bundleDiscount)}</span>}
            <button onClick={addBundleToCart} className="mt-3 w-full h-14 rounded-2xl text-[15px] font-black text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95" style={{ backgroundColor: primaryColor }}>
              <ShoppingCart className="h-5 w-5" /> أضف التشكيلة للسلة
            </button>
          </div>
        </div>

        {/* Product Names List */}
        <div className="mt-6 md:mt-8 space-y-3 bg-gray-50/50 dark:bg-slate-800/30 p-4 rounded-2xl border border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
            <span className="text-sm font-black text-gray-900 dark:text-white">{mainProduct.nameAr}</span>
            <span className="text-sm font-bold text-gray-500 mr-auto tabular-nums">{formatCurrency(mainProduct.price)}</span>
          </div>
          {bundleItems.map(p => {
             const isSelected = selectedIds.has(p.id);
             return (
               <div key={p.id} className={`flex items-center gap-3 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}>
                 <button onClick={() => toggleProduct(p.id)} className={`shrink-0 h-5 w-5 rounded-md flex items-center justify-center border-2 transition-colors ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 dark:border-slate-600'}`}>
                   {isSelected && <CheckCircle className="h-3 w-3 text-white" />}
                 </button>
                 <button onClick={() => toggleProduct(p.id)} className="text-sm font-bold text-gray-700 dark:text-gray-200 line-clamp-1 text-right">{p.nameAr}</button>
                 <span className="text-sm font-bold text-gray-500 mr-auto tabular-nums">{formatCurrency(p.price)}</span>
               </div>
             )
          })}
        </div>
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addItem, getItemCount } = useCartStore();
  const { branding } = useBrandingStore();
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [showAddedFeedback, setShowAddedFeedback] = useState(false);
  const [product, setProduct] = useState<DetailProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedProducts, setRelatedProducts] = useState<DetailProduct[]>([]);

  useEffect(() => {
    async function loadProduct() {
      try {
        const data = await productService.getById(params.id as string);
        const mapped = mapSupabaseProduct(data);
        setProduct(mapped);

        const { data: allProducts } = await productService.getAll({ category_id: data.category_id || undefined, is_active: true, limit: 20 });
        const related = (allProducts || [])
          .filter((p: any) => p.id !== params.id)
          .slice(0, 4)
          .map(mapSupabaseProduct);
        setRelatedProducts(related);
      } catch {
        const fallback = SAMPLE_PRODUCTS_FULL.find((p) => p.id === params.id);
        if (fallback) {
          setProduct({
            id: fallback.id,
            name: fallback.name,
            nameAr: fallback.nameAr,
            price: fallback.price,
            baseUnit: fallback.baseUnit,
            categoryId: (fallback as any).categoryId,
          });
        }
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
    const ch = supabase.channel('shop-product-detail-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => loadProduct())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [params.id]);

  const category = product?.categoryId || 'cat-pasta';
  const gradient = getCategoryGradient(category);
  const imageUrl = product?.image || '/product-placeholder.svg';
  const allImages = [imageUrl];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#020617] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#020617] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-6xl">🔍</div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">المنتج غير موجود</p>
          <button onClick={() => router.push('/shop')} className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-emerald-500">
            العودة للمتجر
          </button>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addItem({ productId: product.id, name: product.name, nameAr: product.nameAr, price: product.price, quantity: 1, image: undefined, unit: product.baseUnit, maxQuantity: 99 });
    }
    setShowAddedFeedback(true);
    setTimeout(() => setShowAddedFeedback(false), 2000);
    toast.success(`تمت إضافة ${product.nameAr} ×${quantity}`);
  };

  const primaryColor = branding.primaryColor || '#22C55E';
  const cartCount = getItemCount();

  const isLowStock = (branding.lowStockEnabled !== false) && (product.stock ?? 0) > 0 && (product.stock ?? 0) <= (branding.lowStockThreshold || 5);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#020617]">
      {/* ───── Top Nav (Noon/Amazon-style: full-width) ───── */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-b border-gray-100/50 dark:border-slate-800/50 shadow-sm">
        <div className="px-3 sm:px-4 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
              <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
            <span className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[150px] sm:max-w-xs">{product.nameAr}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsWishlisted(!isWishlisted)} className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
              <Heart className={`h-5 w-5 ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
            </button>
            <button className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
              <Share2 className="h-5 w-5 text-gray-900 dark:text-white" />
            </button>
            <button onClick={() => { if (cartCount === 0) { toast.error('السلة فارغة'); return; } router.push('/checkout'); }}
              className="h-10 px-4 rounded-xl text-white text-sm font-bold flex items-center gap-2 relative" style={{ backgroundColor: primaryColor }}>
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">السلة</span>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold ring-2 ring-white dark:ring-slate-950">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ───── Main Content ───── */}
      <main className="max-w-7xl mx-auto px-4 py-6 md:py-12 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
          {/* Left: Product Gallery */}
          <div className="order-1">
            <div className="sticky top-20">
              <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
                {/* Main Image */}
                <div className="relative aspect-square flex items-center justify-center bg-gray-50 dark:bg-slate-800/50">
                  <motion.img
                    key={currentImage}
                    src={allImages[currentImage] || imageUrl}
                    alt={product.nameAr}
                    className="w-full h-full object-cover"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4 }}
                  />
                  {/* Navigation Arrows */}
                  {allImages.length > 1 && (
                    <>
                      <button onClick={() => setCurrentImage((currentImage - 1 + allImages.length) % allImages.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-white transition-all">
                        <ChevronRight className="w-5 h-5 text-gray-700" />
                      </button>
                      <button onClick={() => setCurrentImage((currentImage + 1) % allImages.length)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-white transition-all">
                        <ChevronLeft className="w-5 h-5 text-gray-700" />
                      </button>
                    </>
                  )}
                </div>

                {/* Thumbnails */}
                {allImages.length > 1 && (
                  <div className="flex gap-2 p-3 overflow-x-auto">
                    {allImages.map((img, i) => (
                      <button key={i} onClick={() => setCurrentImage(i)}
                        className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                          i === currentImage ? 'border-emerald-500 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}>
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Product Info */}
          <div className="order-2 space-y-4">
            {/* Product Title & Rating */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-5 sm:p-6">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-snug">{product.nameAr}</h1>
              <p className="text-sm text-gray-400 mt-1">{product.name}</p>

              <div className="flex items-center gap-3 mt-4">
                <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-xl">
                  <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                  <span className="text-sm font-bold text-amber-700 dark:text-amber-300">4.8</span>
                  <span className="text-xs text-amber-600/70">(120 تقييم)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${(product.stock ?? 0) > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  <div className={`h-2.5 w-2.5 rounded-full ${(product.stock ?? 0) > 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span className="text-sm font-medium">
                    {(product.stock ?? 0) > 0 ? 'متوفر' : 'نفذ'}
                  </span>
                  {isLowStock && (
                    <span className="text-xs font-bold text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-md mr-2 animate-pulse">
                      باقي {product.stock} فقط في المخزن
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Price */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-5 sm:p-6">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-3xl sm:text-4xl font-black text-emerald-600">{formatCurrency(product.price)}</span>
                <span className="text-sm text-gray-400">/ {product.baseUnit === 'piece' ? 'قطعة' : product.baseUnit}</span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <>
                    <span className="text-lg text-gray-400 line-through">{formatCurrency(product.originalPrice)}</span>
                    <span className="text-sm font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-lg">
                      -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Quantity */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-5 sm:p-6">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">الكمية</h3>
              <div className="flex items-center gap-4">
                <div className="quantity-selector">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                    <Minus className="h-4 w-4" />
                  </button>
                  <span>{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)}>
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 text-left">
                  <span className="text-sm text-gray-500">الإجمالي:</span>
                  <span className="text-xl font-black text-emerald-600 mr-2">{formatCurrency(product.price * quantity)}</span>
                </div>
              </div>
            </div>

            {/* Delivery Info */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Truck, title: 'توصيل سريع', desc: 'خلال 30 دقيقة' },
                { icon: Shield, title: 'جودة مضمونة', desc: 'منتجات طازجة' },
                { icon: RotateCcw, title: 'إرجاع سهل', desc: 'خلال 24 ساعة' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-4 text-center">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-2">
                    <Icon className="h-5 w-5 text-emerald-500" />
                  </div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{title}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{desc}</p>
                </div>
              ))}
            </div>

            {/* Description */}
            {product.description && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">وصف المنتج</h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}

            {/* Action Buttons - Desktop */}
            <div className="hidden lg:flex items-center gap-4 pt-4">
              <button onClick={handleAddToCart}
                className="flex-1 h-14 rounded-2xl text-[15px] font-black text-gray-900 dark:text-white bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm border border-transparent">
                <ShoppingCart className="h-5 w-5" /> أضف للسلة
              </button>
              <button onClick={() => { handleAddToCart(); router.push('/checkout'); }}
                className="flex-[1.5] h-14 rounded-2xl text-[15px] font-black text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95"
                style={{ backgroundColor: primaryColor, backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.1), transparent)' }}>
                <MessageCircle className="h-5 w-5" /> اطلب الآن
              </button>
            </div>
          </div>
        </div>

        {/* ───── Ratings & Reviews ───── */}
        <div className="mt-8 sm:mt-12 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-5 sm:p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">تقييمات العملاء</h3>
          
          {/* Rating Summary */}
          <div className="flex items-center gap-6 mb-6 pb-6 border-b border-gray-100 dark:border-slate-800">
            <div className="text-center">
              <div className="text-4xl font-black text-gray-900 dark:text-white">4.8</div>
              <div className="flex items-center gap-1 mt-1">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className={`h-4 w-4 ${i <= 4 ? 'fill-amber-400 text-amber-400' : 'fill-amber-200 text-amber-200'}`} />
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">120 تقييم</p>
            </div>
            <div className="flex-1 space-y-1.5">
              {[
                { stars: 5, pct: 78, count: 94 },
                { stars: 4, pct: 15, count: 18 },
                { stars: 3, pct: 4, count: 5 },
                { stars: 2, pct: 2, count: 2 },
                { stars: 1, pct: 1, count: 1 },
              ].map(r => (
                <div key={r.stars} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-3">{r.stars}</span>
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${r.pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-left">{r.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sample Reviews */}
          <div className="space-y-4">
            {[
              { name: 'أحمد م.', rating: 5, date: 'منذ يومين', text: 'منتج ممتاز وجودة عالية! التوصيل كان سريع جداً والتغليف محكم.', avatar: 'أ' },
              { name: 'سارة ع.', rating: 4, date: 'منذ أسبوع', text: 'جودة جيدة والسعر مناسب. أنصح بالشراء من هذا المتجر.', avatar: 'س' },
              { name: 'محمد خ.', rating: 5, date: 'منذ أسبوعين', text: 'أفضل منتج جربته! سأعيد الطلب بالتأكيد. شكراً على الخدمة الممتازة.', avatar: 'م' },
            ].map((review, i) => (
              <div key={i} className="pb-4 border-b border-gray-50 dark:border-slate-800/50 last:border-0 last:pb-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white text-xs font-bold">
                    {review.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{review.name}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`h-3 w-3 ${s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200 dark:text-slate-700'}`} />
                        ))}
                      </div>
                      <span className="text-[10px] text-gray-400">{review.date}</span>
                    </div>
                  </div>
                  <span className="mr-auto text-[10px] text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">تم الشراء</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{review.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ───── Frequently Bought Together ───── */}
        {relatedProducts.length >= 2 && (
          <FrequentlyBoughtTogether mainProduct={product} relatedProducts={relatedProducts.slice(0, 3)} primaryColor={primaryColor} />
        )}

        {/* ───── Related Products ───── */}
        {relatedProducts.length > 0 && (
          <div className="mt-8 sm:mt-12">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">منتجات مشابهة</h3>
              <button onClick={() => router.push('/shop')} className="text-xs text-emerald-600 font-medium flex items-center gap-1 hover:gap-2 transition-all">
                عرض الكل <ArrowLeft className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {relatedProducts.map((p) => {
                const pCategory = p.categoryId || 'cat-pasta';
                const pGradient = getCategoryGradient(pCategory);
                const pImage = p.image || (p.images && p.images[0]);
                return (
                  <motion.button key={p.id} whileTap={{ scale: 0.95 }} onClick={() => router.push(`/shop/product/${p.id}`)}
                    className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden text-right hover:shadow-md transition-all">
                    <div className="aspect-square flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-slate-800/50">
                      {pImage ? (
                        <img src={pImage} alt={p.nameAr} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-5xl drop-shadow-lg">{pGradient.emoji}</span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-bold text-gray-900 dark:text-white line-clamp-1">{p.nameAr}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span className="text-[10px] text-gray-400">4.8</span>
                      </div>
                      <p className="text-sm font-black text-emerald-600 mt-1">{formatCurrency(p.price)}</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* ───── Trust Badges ───── */}
        <div className="mt-8 sm:mt-12 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/10 dark:to-green-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/20 p-5 sm:p-6">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 text-center">لماذا تختارنا؟</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: Shield, title: 'ضمان الجودة', desc: 'منتجات أصلية 100%' },
              { icon: Truck, title: 'توصيل مجاني', desc: 'للطلبات فوق 100 ج.م' },
              { icon: RotateCcw, title: 'إرجاع مجاني', desc: 'خلال 14 يوم' },
              { icon: MessageCircle, title: 'دعم 24/7', desc: 'واتساب وهاتف' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center">
                <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-2">
                  <Icon className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">{title}</p>
                <p className="text-[10px] text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* ───── Bottom Action Bar (Mobile only) ───── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-3xl border-t border-gray-100 dark:border-slate-800 shadow-[0_-15px_40px_-15px_rgba(0,0,0,0.15)] pb-safe">
        <div className="px-4 py-3 sm:py-4 flex items-center gap-3">
          <button onClick={handleAddToCart}
            className="h-[52px] sm:h-14 px-6 rounded-2xl text-[14px] sm:text-[15px] font-black text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2 active:scale-95 border border-gray-200/80 dark:border-slate-700 shadow-sm">
            <ShoppingCart className="h-5 w-5 shrink-0" />
            <span>للسلة</span>
          </button>
          <button onClick={() => { handleAddToCart(); router.push('/checkout'); }}
            className="flex-1 h-[52px] sm:h-14 rounded-2xl text-[14px] sm:text-[15px] font-black text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95"
            style={{ backgroundColor: primaryColor, backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.15), transparent)' }}>
            <MessageCircle className="h-5 w-5 shrink-0" />
            <span>اطلب الآن</span>
          </button>
        </div>
      </div>

      {/* ───── Added Feedback ───── */}
      <AnimatePresence>
        {showAddedFeedback && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-medium">
            <CheckCircle className="h-5 w-5" /> تمت الإضافة للسلة
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
