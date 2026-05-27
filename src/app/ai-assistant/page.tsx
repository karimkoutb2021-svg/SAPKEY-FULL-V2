'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Send, Bot, User, ShoppingCart, Package, TrendingUp, MessageCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const suggestions = [
  { icon: ShoppingCart, text: 'أظهر مبيعات اليوم' },
  { icon: Package, text: 'المنتجات منخفضة المخزون' },
  { icon: TrendingUp, text: 'تقرير الأرباح الشهرية' },
  { icon: MessageCircle, text: 'أرسل رسالة للعملاء' },
];

async function getAIResponse(query: string): Promise<string> {
  const q = query.trim().toLowerCase();

  // مبيعات اليوم
  if (q.includes('مبيعات') && (q.includes('اليوم') || q.includes('نهار'))) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const { data: orders } = await supabase.from('orders').select('total, status').gte('created_at', today.toISOString());
    const total = (orders || []).reduce((s, o) => s + (o.total || 0), 0);
    const count = (orders || []).length;
    return `📊 مبيعات اليوم: ${count} طلب بقيمة ${total.toLocaleString('ar-EG')} ج.م`;
  }

  // منتجات منخفضة المخزون
  if (q.includes('منخفض') || q.includes('ناقص') || (q.includes('مخزون') && (q.includes('اقل') || q.includes('أقل') || q.includes('منخفض')))) {
    const { data: stock } = await supabase.from('stock_items').select('id, current_qty, min_qty');
    const low = (stock || []).filter((s) => s.current_qty <= s.min_qty);
    if (low.length === 0) return '✅ لا توجد أصناف منخفضة المخزون';
    return `⚠️ يوجد ${low.length} صنف منخفض المخزون (الرصيد <= الحد الأدنى)`;
  }

  // تقرير الأرباح
  if (q.includes('أرباح') || q.includes('ربح') || q.includes('profit')) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const { data: orders } = await supabase.from('orders').select('total, created_at').gte('created_at', firstOfMonth.toISOString());
    const total = (orders || []).reduce((s: number, o: any) => s + (o.total || 0), 0);
    return `📈 إجمالي المبيعات هذا الشهر: ${total.toLocaleString('ar-EG')} ج.م`;
  }

  // طلبات معلقة
  if (q.includes('معلق') || q.includes('قيد') || q.includes('انتظار')) {
    const { data: orders } = await supabase.from('orders').select('id, total, status').eq('status', 'pending');
    const count = (orders || []).length;
    const total = (orders || []).reduce((s: number, o: any) => s + (o.total || 0), 0);
    return `⏳ عدد الطلبات المعلقة: ${count} بقيمة ${total.toLocaleString('ar-EG')} ج.م`;
  }

  // موظفين نشطين
  if (q.includes('موظف') || q.includes('حضور') || q.includes('وقت')) {
    const { data: active } = await supabase.from('time_control').select('id').eq('status', 'active');
    return `👥 الموظفون النشطون حالياً: ${(active || []).length}`;
  }

  return '💡 لم أفهم سؤالك. جرب: "مبيعات اليوم"، "المنتجات منخفضة المخزون"، "تقرير الأرباح الشهرية"، "الطلبات المعلقة"';
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'مرحباً! أنا المساعد الذكي للنظام. كيف يمكنني مساعدتك اليوم؟', timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recRef = useRef<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const ch = supabase.channel('sync-ai')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        window.location.reload();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages((prev) => [...prev, { role: 'user', content: userMsg, timestamp: new Date() }]);
    setInput('');
    setIsProcessing(true);

    const reply = await getAIResponse(userMsg);
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
              <CardTitle className="text-lg">المساعد الذكي بالذكاء الاصطناعي</CardTitle>
              <p className="text-sm text-muted-foreground">اسأل عن أي شيء في النظام أو استخدم الأوامر الصوتية</p>
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
                <p className="text-sm">{msg.content}</p>
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
          <div className="flex gap-2 mb-3">
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

