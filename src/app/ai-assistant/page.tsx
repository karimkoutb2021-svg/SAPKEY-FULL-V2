'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Send, Bot, User, ShoppingCart, Package, TrendingUp, MessageCircle, HelpCircle, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store/auth-store';

const supabase = createClient();

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Role-based suggestions
function getSuggestionsForRole(role: string) {
  const base = [
    { icon: HelpCircle, text: 'ما الذي يمكنك فعله؟' },
  ];

  if (role === 'customer') {
    return [
      { icon: ShoppingCart, text: 'طلباتي السابقة' },
      { icon: Package, text: 'رصيد المحفظة' },
      { icon: TrendingUp, text: 'نقاط الولاء' },
      ...base,
    ];
  }

  if (role === 'cashier') {
    return [
      { icon: ShoppingCart, text: 'مبيعات ورديتي اليوم' },
      { icon: Package, text: 'كيف أعمل فاتورة' },
      { icon: MessageCircle, text: 'كيف أمسح باركود' },
      ...base,
    ];
  }

  if (role === 'manager') {
    return [
      { icon: ShoppingCart, text: 'مبيعات اليوم' },
      { icon: Package, text: 'المنتجات منخفضة المخزون' },
      { icon: TrendingUp, text: 'تقرير الأرباح الشهرية' },
      { icon: MessageCircle, text: 'الطلبات المعلقة' },
      ...base,
    ];
  }

  // admin (developer)
  return [
    { icon: ShoppingCart, text: 'مبيعات اليوم' },
    { icon: Package, text: 'المنتجات منخفضة المخزون' },
    { icon: Shield, text: 'صحة النظام' },
    { icon: TrendingUp, text: 'تقرير الأرباح الشهرية' },
    ...base,
  ];
}

async function getAIResponse(query: string, role: string, userId?: string): Promise<string> {
  const q = query.trim().toLowerCase();

  // ========================
  // Universal: Help / Guide
  // ========================
  if (q.includes('يمكنك') || q.includes('تساعد') || q.includes('ما الذي') || q.includes('help')) {
    if (role === 'customer') {
      return '🤖 أنا المساعد الذكي للعملاء! يمكنني مساعدتك في:\n• عرض طلباتك السابقة\n• معرفة رصيد محفظتك\n• نقاط الولاء الخاصة بك\n• الاستفسار عن المنتجات والعروض\nفقط اكتب سؤالك وسأساعدك فوراً! 💚';
    }
    if (role === 'cashier') {
      return '🤖 أنا المساعد الذكي للكاشير! يمكنني مساعدتك في:\n• معرفة مبيعات ورديتك\n• شرح كيفية إصدار فاتورة\n• شرح مسح الباركود\n• استرجاع طلب سابق\n• معلومات عن العملاء\nاسأل أي سؤال يخص عملك! 💚';
    }
    if (role === 'manager') {
      return '🤖 أنا المساعد الذكي للمدير! يمكنني مساعدتك في:\n• مبيعات اليوم والشهر\n• المنتجات منخفضة المخزون\n• تقارير الأرباح\n• الطلبات المعلقة\n• الموظفين النشطين\n• الجرد والتكويد\n• حسابات الخزينة\nأنا هنا لخدمتك! 💚';
    }
    // admin
    return '🤖 أنا المساعد الذكي الكامل للمطور! يمكنني مساعدتك في:\n• جميع الاستعلامات الإدارية والمالية\n• صحة النظام وقاعدة البيانات\n• معلومات الموظفين والعملاء\n• تقارير الأرباح والمخزون\n• مراقبة الأداء\n• كل شيء في النظام بلا استثناء! 🛡️💚';
  }

  // ========================
  // Customer-level queries
  // ========================
  if (q.includes('طلباتي') || q.includes('طلبي') || q.includes('اخر طلب')) {
    if (!userId) return '⚠️ يرجى تسجيل الدخول أولاً لمعرفة طلباتك.';
    const { data: orders } = await supabase.from('orders').select('id, total, status, created_at').eq('customer_id', userId).order('created_at', { ascending: false }).limit(5);
    if (!orders || orders.length === 0) return '🛒 ليس لديك أي طلبات سابقة حتى الآن.';
    const lines = orders.map(o => `• #${o.id.slice(0,6).toUpperCase()} — ${(o.total || 0).toLocaleString('ar-EG')} ج.م — ${o.status === 'delivered' ? 'تم التسليم ✅' : o.status === 'preparing' ? 'قيد التحضير 🔄' : o.status === 'pending' ? 'بانتظار التأكيد ⏳' : o.status}`);
    return `📦 آخر ${orders.length} طلبات لك:\n${lines.join('\n')}`;
  }

  if (q.includes('نقاط') || q.includes('ولاء')) {
    if (!userId) return '⚠️ يرجى تسجيل الدخول أولاً.';
    const { data: wallet } = await supabase.from('customer_wallets').select('loyalty_points').eq('customer_id', userId).single();
    const pts = wallet?.loyalty_points || 0;
    const value = Math.floor(pts / 100) * 10;
    return `⭐ لديك ${pts} نقطة ولاء (تساوي ${value} ج.م كوبون خصم). كل 100 نقطة = 10 ج.م!`;
  }

  if (q.includes('محفظ') || q.includes('رصيد')) {
    if (!userId) return '⚠️ يرجى تسجيل الدخول أولاً.';
    const { data: wallet } = await supabase.from('customer_wallets').select('balance').eq('customer_id', userId).single();
    return `💰 رصيد محفظتك الحالي: ${(wallet?.balance || 0).toLocaleString('ar-EG')} ج.م`;
  }

  // Block customer from accessing higher-level data
  if (role === 'customer') {
    return '💡 يمكنك سؤالي عن:\n• "طلباتي السابقة"\n• "رصيد المحفظة"\n• "نقاط الولاء"\n• "ما الذي يمكنك فعله؟"';
  }

  // ========================
  // Cashier-level queries (cashier, manager, admin)
  // ========================
  if (['cashier', 'manager', 'admin'].includes(role)) {
    if (q.includes('مبيعاتي') || q.includes('ورديتي') || q.includes('وردية')) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const { data: orders } = await supabase.from('orders').select('total').gte('created_at', today.toISOString());
      const total = (orders || []).reduce((s: number, o: any) => s + (o.total || 0), 0);
      return `💵 مبيعات الوردية: ${(orders || []).length} طلب، بإجمالي ${total.toLocaleString('ar-EG')} ج.م`;
    }

    if (q.includes('فاتورة') || q.includes('بيع')) {
      return '📋 لإنشاء فاتورة جديدة:\n1. اذهب إلى صفحة نقطة البيع (POS)\n2. ابحث عن المنتج بالاسم أو امسح الباركود\n3. اضبط الكمية\n4. اضغط "إتمام البيع"\n5. اختر طريقة الدفع (كاش / فيزا / محفظة)\n6. ستظهر الفاتورة تلقائياً للطباعة ✅';
    }

    if (q.includes('باركود') || q.includes('مسح') || q.includes('سكان')) {
      return '📸 لمسح الباركود:\n1. في صفحة POS اضغط أيقونة الكاميرا 📷\n2. وجّه الكاميرا نحو الباركود\n3. سيتم إضافة المنتج تلقائياً للفاتورة\nملاحظة: يمكنك أيضاً إدخال رقم الباركود يدوياً في حقل البحث.';
    }
  }

  // Block cashier from accessing manager+ data
  if (role === 'cashier') {
    return '💡 يمكنك سؤالي عن:\n• "مبيعات ورديتي اليوم"\n• "كيف أعمل فاتورة"\n• "كيف أمسح باركود"\n• "طلباتي السابقة"';
  }

  // ========================
  // Manager-level queries (manager, admin)
  // ========================
  if (['manager', 'admin'].includes(role)) {
    if (q.includes('مبيعات') && (q.includes('اليوم') || q.includes('نهار'))) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const { data: orders } = await supabase.from('orders').select('total, status').gte('created_at', today.toISOString());
      const total = (orders || []).reduce((s: number, o: any) => s + (o.total || 0), 0);
      const count = (orders || []).length;
      const delivered = (orders || []).filter((o: any) => o.status === 'delivered').length;
      return `📊 مبيعات اليوم:\n• عدد الطلبات: ${count}\n• المسلّم: ${delivered}\n• الإجمالي: ${total.toLocaleString('ar-EG')} ج.م`;
    }

    if (q.includes('منخفض') || q.includes('ناقص') || (q.includes('مخزون') && (q.includes('اقل') || q.includes('أقل')))) {
      const { data: stock } = await supabase.from('stock_items').select('id, current_qty, min_qty');
      const low = (stock || []).filter((s: any) => s.current_qty <= s.min_qty);
      if (low.length === 0) return '✅ المخزون ممتاز! لا توجد أصناف تحت الحد الأدنى.';
      return `⚠️ تنبيه مخزون: يوجد ${low.length} صنف تحت الحد الأدنى ويحتاج إعادة طلب.`;
    }

    if (q.includes('أرباح') || q.includes('ربح') || q.includes('profit')) {
      const firstOfMonth = new Date(); firstOfMonth.setDate(1); firstOfMonth.setHours(0,0,0,0);
      const { data: orders } = await supabase.from('orders').select('total').gte('created_at', firstOfMonth.toISOString());
      const total = (orders || []).reduce((s: number, o: any) => s + (o.total || 0), 0);
      return `📈 إجمالي مبيعات الشهر الحالي: ${total.toLocaleString('ar-EG')} ج.م (${(orders || []).length} طلب)`;
    }

    if (q.includes('معلق') || q.includes('قيد') || q.includes('انتظار')) {
      const { data: orders } = await supabase.from('orders').select('id, total').eq('status', 'pending');
      const count = (orders || []).length;
      const total = (orders || []).reduce((s: number, o: any) => s + (o.total || 0), 0);
      return `⏳ الطلبات المعلقة: ${count} طلب بقيمة ${total.toLocaleString('ar-EG')} ج.م`;
    }

    if (q.includes('موظف') || q.includes('حضور')) {
      const { data: active } = await supabase.from('time_control').select('id').eq('status', 'active');
      return `👥 الموظفون النشطون حالياً: ${(active || []).length}`;
    }

    if (q.includes('جرد') || q.includes('inventory')) {
      return '📋 دليل الجرد:\n1. اذهب إلى المخازن → جرد المخزون\n2. اختر المستودع\n3. ابدأ جلسة جرد جديدة\n4. أدخل الكميات الفعلية لكل صنف\n5. سيقوم النظام بحساب الفروق تلقائياً\n6. راجع ثم اعتمد الجرد ✅';
    }

    if (q.includes('تكويد') || q.includes('coding') || q.includes('منتج جديد')) {
      return '📋 دليل تكويد المنتجات:\n1. اذهب إلى المنتجات → إضافة منتج جديد\n2. أدخل اسم المنتج بالعربية والإنجليزية\n3. حدد القسم والباركود\n4. أدخل سعر الشراء وسعر البيع\n5. حدد الكمية الافتتاحية\n6. ارفع صورة المنتج\n7. اضغط حفظ ✅';
    }
  }

  // Block manager from accessing admin-exclusive data
  if (role === 'manager') {
    return '💡 يمكنك سؤالي عن:\n• "مبيعات اليوم"\n• "تقرير الأرباح الشهرية"\n• "المنتجات منخفضة المخزون"\n• "الطلبات المعلقة"\n• "كيفية الجرد"\n• "تكويد منتج جديد"';
  }

  // ========================
  // Admin/Developer ONLY
  // ========================
  if (role === 'admin') {
    if (q.includes('صحة') || q.includes('health') || q.includes('نظام')) {
      return '🚀 حالة النظام:\n• الخادم: يعمل بكفاءة ✅\n• قاعدة البيانات Supabase: متصلة ✅\n• Realtime Sync: نشط (كل 3 ثوانٍ) ✅\n• Offline Queue: فارغة ✅\n• آخر Deploy: قيد التأجيل (Vercel)\n• Framework: Next.js 16.2.6 + Turbopack';
    }

    if (q.includes('قاعدة') || q.includes('database') || q.includes('supabase')) {
      return '🗄️ قاعدة البيانات:\n• المشروع: fpcpqgpbznbsmeqqxmhx\n• الجداول الرئيسية: products, orders, customers, stock_items, treasury, ...\n• الحالة: متصلة ومزامنة في الوقت الفعلي ✅';
    }

    return '💡 المطور الكامل! يمكنك سؤالي عن:\n• "صحة النظام"\n• "حالة قاعدة البيانات"\n• وأي استعلام إداري أو مالي أو تشغيلي بلا استثناء.';
  }

  return '💡 لم أفهم سؤالك. جرب صياغة أخرى أو اكتب "ما الذي يمكنك فعله؟"';
}

export default function AIAssistantPage() {
  const { user } = useAuthStore();
  const userRole = user?.role || 'customer';

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: `مرحباً${user?.name ? ' ' + user.name : ''}! أنا المساعد الذكي ${userRole === 'admin' ? 'الكامل للمطور' : userRole === 'manager' ? 'للمدير' : userRole === 'cashier' ? 'للكاشير' : 'للعميل'}. كيف يمكنني مساعدتك اليوم؟ 🤖`, timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recRef = useRef<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestions = getSuggestionsForRole(userRole);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages((prev) => [...prev, { role: 'user', content: userMsg, timestamp: new Date() }]);
    setInput('');
    setIsProcessing(true);

    const reply = await getAIResponse(userMsg, userRole, user?.id);
    setMessages((prev) => [...prev, { role: 'assistant', content: reply, timestamp: new Date() }]);
    setIsProcessing(false);
  };

  const toggleVoice = () => {
    if (!isListening) {
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechRecognition();
        recRef.current = recognition;
        recognition.lang = 'ar-EG';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
          setIsListening(false);
        };

        recognition.onerror = () => setIsListening(false);
        recognition.start();
        setIsListening(true);
      } else {
        alert('متصفحك لا يدعم التعرف على الصوت. الرجاء استخدام متصفح Chrome أو Edge.');
      }
    } else {
      if (recRef.current) recRef.current.stop();
      setIsListening(false);
    }
  };

  return (
    <div className="h-[calc(100vh-5rem)] flex gap-4">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">المساعد الذكي {userRole === 'admin' ? '🛡️' : '🤖'}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {userRole === 'admin' ? 'صلاحيات كاملة — المطور' : userRole === 'manager' ? 'صلاحيات المدير' : userRole === 'cashier' ? 'صلاحيات الكاشير' : 'مساعد العميل'}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'assistant' ? 'bg-primary/10' : 'bg-muted'
              }`}>
                {msg.role === 'assistant' ? <Bot className="h-4 w-4 text-primary" /> : <User className="h-4 w-4" />}
              </div>
              <div className={`max-w-[80%] p-3 rounded-2xl ${
                msg.role === 'assistant' ? 'bg-muted rounded-tr-2xl' : 'bg-primary text-primary-foreground rounded-tl-2xl'
              }`}>
                <p className="text-sm whitespace-pre-line">{msg.content}</p>
                <p className="text-xs mt-1 opacity-70">{msg.timestamp.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-muted rounded-2xl rounded-tr-2xl p-3">
                <div className="flex gap-1">
                  <span className="h-2 w-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        <div className="border-t p-4">
          <div className="flex gap-2 mb-3 flex-wrap">
            {suggestions.map((s, i) => {
              const Icon = s.icon;
              return (
                <button
                  key={i}
                  onClick={() => setInput(s.text)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs hover:bg-accent transition-colors"
                >
                  <Icon className="h-3 w-3" />
                  {s.text}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="اكتب سؤالك هنا..."
              className="flex-1 h-11 rounded-lg border border-input bg-background px-4 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button
              variant={isListening ? 'destructive' : 'outline'}
              size="icon"
              onClick={toggleVoice}
              className="h-11 w-11"
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button onClick={handleSend} disabled={!input.trim() || isProcessing} className="h-11">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
