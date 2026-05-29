'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, ShoppingCart, Package, Plus, Minus, Trash2, Volume2, CheckCircle, AlertCircle, Loader2, Headphones, Sparkles, Search, X, CreditCard, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { voiceEngine, isVoiceSupported } from '@/lib/ai-voice/voice-engine';
import { parseVoiceOrder, defaultProducts as fallbackProducts, generateConfirmationMessage, type ParsedOrder, type ProductLookup } from '@/lib/ai-voice/order-parser';
import { usePOSStore, type POSCartItem } from '@/lib/pos/pos-store';
import { InvoicePreview } from '@/components/pos/invoice-preview';
import { createClient } from '@/lib/supabase/client';
import type { Product } from '@/types/erp';
import toast from 'react-hot-toast';

const supabase = createClient();

function toProductLookup(p: Product): ProductLookup {
  const nameEn = p.name_en || p.name_ar;
  const keywords = [p.name_ar, nameEn, p.sku]
    .filter(Boolean)
    .concat(p.name_ar.split(' '))
    .filter(Boolean) as string[];
  return {
    id: p.id,
    name: nameEn,
    nameAr: p.name_ar,
    keywords: [...new Set(keywords)],
    price: p.sale_price || p.unit_price || 0,
    unit: p.unit === 'kg' || p.name_ar.includes('كيلو') ? 'kg' : 'piece',
  };
}

type OrderState = 'idle' | 'listening' | 'processing' | 'confirming' | 'completed';

const suggestedCommands = [
  { text: '٣ كوكاكولا و٢ حليب', label: 'مشروبات', icon: '🥤' },
  { text: 'نصف كيلو جبنة', label: 'ألبان', icon: '🧀' },
  { text: '٢ خبز و١٠ بيض', label: 'مخبوزات', icon: '🥖' },
  { text: 'شبسي وماء', label: 'مقرمشات', icon: '🍿' },
];


export default function AIOrderingPage() {
  const { cart, addToCart, removeFromCart, updateQuantity, completeOrder, getTotal, getSubtotal, clearCart, paymentMethod, setPaymentMethod } = usePOSStore();
  const [orderState, setOrderState] = useState<OrderState>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [lastOrder, setLastOrder] = useState<ParsedOrder | null>(null);
  const [confirmation, setConfirmation] = useState<string>('');
  const [showInvoice, setShowInvoice] = useState(false);
  const [completedOrderObj, setCompletedOrderObj] = useState<any>(null);
  const [voiceHistory, setVoiceHistory] = useState<string[]>([]);
  const [products, setProducts] = useState<ProductLookup[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const productsRef = useRef(products);
  const scrollRef = useRef<HTMLDivElement>(null);
  const quickProducts = products.slice(0, 8);

  useEffect(() => { productsRef.current = products; }, [products]);

  useEffect(() => {
    loadProducts();
    const channel = supabase.channel('ai-products-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => loadProducts())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadProducts = async () => {
    try {
      const { data } = await supabase
        .from('products')
        .select('id, name_ar, name_en, sku, barcode, unit_price, cost_price, sale_price, image_url, category_id, unit, current_stock, min_stock_level, description, is_active, created_at, updated_at')
        .eq('is_active', true)
        .limit(200);
      if (data && data.length > 0) {
        setProducts(data.map(toProductLookup));
      } else {
        setProducts(fallbackProducts);
      }
    } catch {
      setProducts(fallbackProducts);
    }
    setProductsLoaded(true);
  };


  useEffect(() => {
    voiceEngine.configure({
      onResult: (text, isFinal) => {
        if (isFinal) {
          setTranscript(text);
          setVoiceHistory((prev) => [text, ...prev].slice(0, 20));
          processOrder(text);
        } else {
          setInterimText(text);
        }
      },
      onStateChange: (state) => {
        setOrderState(state === 'listening' ? 'listening' : state === 'speaking' ? 'processing' : 'idle');
      },
      onError: (error) => {
        toast.error(error);
        setOrderState('idle');
      },
      continuous: true,
    });

    return () => { voiceEngine.destroy(); };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [voiceHistory]);

  const processOrder = useCallback((text: string) => {
    setOrderState('processing');

    setTimeout(() => {
      const activeProducts = productsRef.current;
      const parsed = parseVoiceOrder(text, activeProducts);
      setLastOrder(parsed);

      if (parsed.items.length === 0) {
        setConfirmation('لم أتمكن من التعرف على المنتجات. حاول مرة أخرى');
        setOrderState('idle');
        return;
      }

      // Add items to cart
      for (const item of parsed.items) {
        const product = activeProducts.find((p) => p.nameAr === item.productName);
        if (product) {
          const qty = item.unit === 'kg' && item.weight ? item.weight : item.quantity;
          addToCart({
            productId: product.id,
            name: product.name,
            nameAr: product.nameAr,
            price: product.price,
            quantity: qty,
            barcode: '',
            unit: product.unit,
            taxRate: 0,
            itemDiscount: 0,
            itemDiscountType: 'none',
            total: product.price * qty,
          });
        }
      }

      const confirmMsg = generateConfirmationMessage(parsed);
      setConfirmation(confirmMsg);
      setOrderState('confirming');

      // Speak confirmation
      voiceEngine.speak(confirmMsg);

      // Auto-reset after 3 seconds
      setTimeout(() => {
        setConfirmation('');
        setOrderState('listening');
      }, 3000);
    }, 800);
  }, [addToCart]);

  const toggleListening = () => {
    if (orderState === 'listening') {
      voiceEngine.stop();
      setOrderState('idle');
      setInterimText('');
    } else {
      voiceEngine.start();
    }
  };

  const handleVoiceShortcut = (text: string) => {
    processOrder(text);
  };

  const handleCompleteOrder = async () => {
    const order = await completeOrder();
    setCompletedOrderObj(order);
    setShowInvoice(true);
    toast.success('تم إتمام الطلب!');
  };

  const quickAddToCart = (product: ProductLookup) => {
    addToCart({
      productId: product.id,
      name: product.name,
      nameAr: product.nameAr,
      price: product.price,
      quantity: 1,
      barcode: '',
      unit: product.unit,
      taxRate: 0,
      itemDiscount: 0,
      itemDiscountType: 'none',
      total: product.price,
    });
  };

  const subtotal = getSubtotal();
  const total = getTotal();

  return (
    <div className="h-[calc(100vh-4rem)] flex gap-4 p-4">
      {/* Left - Voice + Products */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Voice Status */}
        <Card className={`relative overflow-hidden transition-all ${orderState === 'listening' ? 'ring-2 ring-primary shadow-lg' : ''}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={orderState === 'listening' ? { scale: [1, 1.15, 1], opacity: [1, 0.7, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center ${orderState === 'listening' ? 'bg-red-500 text-white' : 'bg-muted'}`}>
                    <Headphones className="h-6 w-6" />
                  </div>
                </motion.div>
                <div>
                  <h2 className="text-lg font-bold">
                    {orderState === 'listening' ? 'استمع... تحدث الآن' : 'الطلب الصوتي الذكي'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {orderState === 'listening'
                      ? 'قل اسم المنتج والكمية... مثلاً: "٣ كوكاكولا واثنين حليب"'
                      : 'اضغط على الميكروفون وابدأ التحدث'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {orderState === 'listening' && (
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" style={{ animationDelay: '0.3s' }} />
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" style={{ animationDelay: '0.6s' }} />
                  </div>
                )}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleListening}
                  className={`h-14 w-14 rounded-full flex items-center justify-center transition-all ${
                    orderState === 'listening'
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  {orderState === 'listening' ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </motion.button>
              </div>
            </div>

            {/* Voice Waveform Animation */}
            {orderState === 'listening' && (
              <div className="flex items-center gap-0.5 justify-center mt-4 h-8">
                {Array.from({ length: 40 }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: [4, 8, 16, 24, 16, 8, 4] }}
                    transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.05 }}
                    className="w-1 bg-primary/40 rounded-full"
                  />
                ))}
              </div>
            )}

            {/* Real-time transcript */}
            <AnimatePresence mode="wait">
              {(interimText || transcript) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 p-4 rounded-xl bg-muted/50 text-center"
                >
                  <p className="text-lg font-medium">{interimText || transcript}</p>
                  {orderState === 'processing' && (
                    <div className="flex items-center justify-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> جاري معالجة الطلب...
                    </div>
                  )}
                  {confirmation && (
                    <motion.div
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      className="flex items-center justify-center gap-2 mt-2 text-emerald-600 font-medium"
                    >
                      <CheckCircle className="h-5 w-5" /> {confirmation}
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Suggested commands */}
            <div className="flex gap-2 mt-4 flex-wrap">
              {suggestedCommands.map((cmd) => (
                <button
                  key={cmd.text}
                  onClick={() => handleVoiceShortcut(cmd.text)}
                  disabled={orderState === 'processing'}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs hover:bg-accent hover:border-primary transition-all disabled:opacity-50"
                >
                  <span>{cmd.icon}</span>
                  {cmd.text}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Products */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">منتجات سريعة</span>
            <span className="text-xs text-muted-foreground">اضغط للإضافة السريعة</span>
          </div>
          <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
            {quickProducts.map((product) => (
              <motion.button
                key={product.id}
                whileTap={{ scale: 0.92 }}
                onClick={() => quickAddToCart(product)}
                className="flex flex-col items-center p-3 rounded-xl border-2 bg-card hover:border-primary hover:bg-accent/50 transition-all"
              >
                <Package className="h-6 w-6 text-muted-foreground mb-1" />
                <p className="text-xs font-medium text-center line-clamp-1">{product.nameAr}</p>
                <p className="text-sm font-bold text-primary mt-0.5">{formatCurrency(product.price)}</p>
                <Badge variant="outline" className="text-[10px] mt-0.5">{product.unit === 'kg' ? 'كيلو' : 'حبة'}</Badge>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Right - Cart Panel */}
      <div className="w-96 flex flex-col bg-card rounded-2xl border shadow-sm">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <span className="font-semibold">الفاتورة</span>
            <Badge variant="secondary" className="text-xs">{cart.length} أصناف</Badge>
          </div>
          <button onClick={clearCart} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-red-500">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Cart Items */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4">
              <Headphones className="h-16 w-16 mb-3 opacity-30" />
              <p className="font-medium">السلة فارغة</p>
              <p className="text-sm text-center">استخدم الميكروفون لإضافة منتجات<br />أو اختر من المنتجات السريعة</p>
            </div>
          ) : (
            cart.map((item) => (
              <motion.div key={item.productId} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/40">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.nameAr}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(item.price)} / {item.unit}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))} className="h-7 w-7 rounded-lg bg-background border flex items-center justify-center hover:bg-accent"><Minus className="h-3 w-3" /></button>
                  <span className="w-8 text-center text-sm font-bold tabular-nums">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="h-7 w-7 rounded-lg bg-background border flex items-center justify-center hover:bg-accent"><Plus className="h-3 w-3" /></button>
                </div>
                <p className="text-sm font-bold w-20 text-left tabular-nums">{formatCurrency(item.price * item.quantity)}</p>
                <button onClick={() => removeFromCart(item.productId)} className="h-7 w-7 rounded-lg hover:bg-red-100 hover:text-red-600 flex items-center justify-center"><Trash2 className="h-3 w-3" /></button>
              </motion.div>
            ))
          )}

          {/* Voice History */}
          {voiceHistory.length > 0 && cart.length > 0 && (
            <div className="mt-4 pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-2">آخر الأوامر الصوتية:</p>
              <div className="space-y-1">
                {voiceHistory.slice(0, 3).map((h, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mic className="h-3 w-3" />
                    <span className="line-clamp-1">{h}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Total & Payment */}
        <div className="border-t p-3 space-y-2.5">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">المجموع</span><span className="tabular-nums">{formatCurrency(subtotal)}</span></div>
            <div className="flex justify-between text-lg font-bold">
              <span>الإجمالي</span>
              <span className="text-primary tabular-nums">{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {[
              { key: 'cash', label: 'نقداً', icon: Wallet },
              { key: 'card', label: 'بطاقة', icon: CreditCard },
              { key: 'wallet', label: 'محفظة', icon: CreditCard },
            ].map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setPaymentMethod(key as any)}
                className={`flex items-center justify-center gap-1 p-2 rounded-xl border text-xs transition-all ${paymentMethod === key ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-accent'}`}>
                <Icon className="h-3.5 w-3.5" />{label}
              </button>
            ))}
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleCompleteOrder}
            disabled={cart.length === 0}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {orderState === 'listening' ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> استمع للأوامر الصوتية...</>
            ) : (
              <><CheckCircle className="h-5 w-5" /> إتمام الطلب - {formatCurrency(total)}</>
            )}
          </motion.button>
        </div>
      </div>

      {/* Invoice Preview */}
      <InvoicePreview order={completedOrderObj} onClose={() => { setShowInvoice(false); setCompletedOrderObj(null); }} />
    </div>
  );
}
