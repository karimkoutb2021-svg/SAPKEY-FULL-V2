import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export const customerOrderService = {
  async getOrderHistory(userId: string) {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .or(`customer_id.eq.${userId},customer_phone.neq.`)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return (orders || []).map((o: any) => ({
      ...o,
      items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
    }));
  },

  async getOrderById(orderId: string) {
    const { data, error } = await supabase.from('orders').select('*').eq('id', orderId).single();
    if (error) throw error;
    return { ...data, items: typeof data.items === 'string' ? JSON.parse(data.items) : data.items };
  },

  async quickReorder(orderId: string) {
    const { data: original } = await supabase.from('orders').select('*').eq('id', orderId).single();
    if (!original) throw new Error('Order not found');
    const items = typeof original.items === 'string' ? JSON.parse(original.items) : original.items;
    return { items, total: original.total, notes: `إعادة طلب من الفاتورة ${original.order_number || original.id.slice(0, 8)}` };
  },

  async reserveStock(orderId: string, items: any[], warehouseId?: string) {
    const warehouse = warehouseId || (await getDefaultWarehouse());
    const reservations = [];

    for (const item of items) {
      const qty = item.quantity || 1;
      const productId = item.product_id || item.id;

      if (productId) {
        await supabase.from('stock_reservations').insert({
          order_id: orderId,
          product_id: productId,
          warehouse_id: warehouse,
          quantity: qty,
          status: 'active',
          expires_at: new Date(Date.now() + 30 * 60000).toISOString(),
        });
        reservations.push({ productId, qty, warehouse });
      }
    }
    return reservations;
  },

  async releaseReservations(orderId: string) {
    await supabase.from('stock_reservations').update({ status: 'released' }).eq('order_id', orderId);
  },

  async deductReservations(orderId: string) {
    const { data: reservations } = await supabase.from('stock_reservations').select('*').eq('order_id', orderId).eq('status', 'active');
    if (!reservations) return;

    for (const r of reservations) {
      const { data: stock } = await supabase.from('stock_items').select('*').eq('product_id', r.product_id).maybeSingle();
      if (stock) {
        await supabase.from('stock_items').update({ current_qty: stock.current_qty - r.quantity }).eq('id', stock.id);
        await supabase.from('product_history').insert({
          product_id: r.product_id,
          warehouse_id: r.warehouse_id,
          quantity_change: -r.quantity,
          movement_type: 'sale',
          reference: `order:${orderId}`,
        });
      }
      await supabase.from('stock_reservations').update({ status: 'deducted' }).eq('id', r.id);
    }
  },
};

export const productViewService = {
  async getSmartCatalog(userId: string, categoryId?: string) {
    let query = supabase.from('products').select('*, product_categories!inner(name_ar)').eq('is_active', true);
    if (categoryId) query = query.eq('category_id', categoryId);

    const { data: products } = await query.limit(100);
    const allProducts = (products || []).map((p: any) => ({ ...p, category_name: p.product_categories?.name_ar }));

    // Get user's most-purchased products
    const { data: history } = await supabase
      .from('customer_order_history')
      .select('order_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    const frequentProductIds = new Set<string>();
    if (history) {
      for (const h of history) {
        const order = await customerOrderService.getOrderById(h.order_id).catch(() => null);
        if (order?.items) {
          for (const item of order.items) {
            if (item.product_id || item.id) frequentProductIds.add(item.product_id || item.id);
          }
        }
      }
    }

    // Sort: frequent first, then rest
    allProducts.sort((a: any, b: any) => {
      const aFreq = frequentProductIds.has(a.id) ? 0 : 1;
      const bFreq = frequentProductIds.has(b.id) ? 0 : 1;
      return aFreq - bFreq;
    });

    return allProducts;
  },
};

async function getDefaultWarehouse() {
  const { data } = await supabase.from('warehouses').select('id').eq('type', 'display').limit(1).maybeSingle();
  if (data) return data.id;
  const { data: first } = await supabase.from('warehouses').select('id').limit(1).maybeSingle();
  return first?.id || null;
}

export const customerAssistantService = {
  processQuery(text: string): { action: string; params: any } {
    const normalized = text.replace(/[^\u0600-\u06FF\w\s]/g, '').trim();
    const lower = normalized.toLowerCase();

    // Detect intent
    if (/(عايز|طلب|اطلب|احتاج|اديني|جيب|هات)/.test(lower)) {
      return { action: 'ADD_TO_CART', params: { raw: normalized } };
    }
    if (/(طلبى|اوردرى|الاوردر|الطلب|وصل|توصيل|كده|قد ايه)/.test(lower)) {
      return { action: 'TRACK_ORDER', params: {} };
    }
    if (/(رصيد|فلوس|محفظة|شحن|حساب)/.test(lower)) {
      return { action: 'CHECK_WALLET', params: {} };
    }
    if (/(منتجات|اقسام|صنف|حاجة|عروض|تخفيضات)/.test(lower)) {
      return { action: 'BROWSE_CATALOG', params: {} };
    }
    if (/(نقاط|لويالتى|كوبون|خصم)/.test(lower)) {
      return { action: 'LOYALTY', params: {} };
    }
    if (/(ساعد|ازاى|ازاي|طريقة|شرح|اعمل)/.test(lower)) {
      return { action: 'HELP', params: {} };
    }
    return { action: 'UNKNOWN', params: { raw: normalized } };
  },

  getResponse(action: string, params: any, orderETA?: number): { message: string; type: string } {
    switch (action) {
      case 'ADD_TO_CART':
        return { message: 'تمام يا فندم 🛒 هضيفلك المنتجات دي في السلة. ممكن تكمل ولا عايز حاجة تاني؟', type: 'cart' };
      case 'TRACK_ORDER':
        return {
          message: orderETA
            ? `الطلب بيتجهز وهيجيلك خلال ${orderETA} دقيقة بالظبط يا فندم 🚴`
            : 'الطلب بيتجهز وهيجيلك خلال 45 دقيقة بالظبط يا فندم 🚴',
          type: 'tracking'
        };
      case 'CHECK_WALLET':
        return { message: 'محفظتك جاهزة يا فندم 💰 تقدر تشحن وتستخدم فلوسك في أي وقت', type: 'wallet' };
      case 'BROWSE_CATALOG':
        return { message: 'تصفح الأقسام والمنتجات كلها قدامك 📱 اختر اللي يعجبك', type: 'catalog' };
      case 'LOYALTY':
        return { message: 'نقاط الولاية بتاعتك بتزيد مع كل طلب ⭐ حولها لكوبونات خصم', type: 'loyalty' };
      case 'HELP':
        return { message: 'أنا هنا عشان أساعدك 😊 تقدر تطلب أي منتج، تشوف رصيدك، أو تتابع طلبك', type: 'help' };
      default:
        return { message: 'آسف يا فندم، مش فاهمك 😅 ممكن توضح أكتر؟', type: 'unknown' };
    }
  }
};
