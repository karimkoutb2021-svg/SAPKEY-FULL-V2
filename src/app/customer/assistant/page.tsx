'use client';

import { useState, useRef, useCallback } from 'react';
import { customerAssistantService } from '@/lib/customer-services/customer-orders';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function AssistantPage() {
  const [messages, setMessages] = useState<Array<{ text: string; from: 'user' | 'bot'; type?: string }>>([
    { text: 'مرحباً بك يا فندم 😊 أنا مساعدك الذكي. تقدر تطلب أي حاجة بالصوت أو الكتابة!', from: 'bot', type: 'greeting' },
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSend = useCallback((text: string) => {
    if (!text.trim()) return;
    setMessages(prev => [...prev, { text, from: 'user' }]);

    const result = customerAssistantService.processQuery(text);
    const response = customerAssistantService.getResponse(result.action, result.params, 45);

    setTimeout(() => {
      setMessages(prev => [...prev, { text: response.message, from: 'bot', type: response.type }]);
      speakText(response.message);
    }, 800);

    setInput('');
  }, []);

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ar-EG';
      utterance.rate = 0.9;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('المتصفح لا يدعم التعرف الصوتي');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-EG';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      handleSend(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
      toast.error('مشكلة في التعرف الصوتي');
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const quickQueries = [
    { text: 'عايز كرتونة مياه صغيرة ومعاها كيسين شيبسي عائلي', icon: '🛒' },
    { text: 'هو طلبي هتوصلوه في قد ايه؟', icon: '🚚' },
    { text: 'عندي كام نقطة ولاء؟', icon: '⭐' },
    { text: 'فلوسي في المحفظة كام؟', icon: '💰' },
    { text: 'عايز حاجة حلوة', icon: '🍪' },
    { text: 'ازاي أشحن المحفظة؟', icon: '💳' },
  ];

  return (
    <div className="p-4 space-y-4 max-w-lg mx-auto flex flex-col h-[calc(100vh-5rem)]">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold">المساعد الذكي 🤖</h1>
        <Link href="/customer" className="text-xs text-white/50 hover:text-white">رجوع</Link>
      </div>

      <p className="text-xs text-white/40 text-center -mt-2">اسأل بالعامية المصرية — صوت أو كتابة</p>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-2 scrollbar-thin">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={msg.from === 'user'
              ? 'bg-emerald-500/20 border border-emerald-500/30 rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[85%]'
              : 'bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[85%]'
            }>
              <p className="text-sm leading-relaxed">{msg.text}</p>
              {msg.from === 'bot' && msg.type === 'tracking' && (
                <Link href="/customer/orders" className="inline-block mt-2 text-[10px] text-emerald-400 hover:text-emerald-300">
                  تتبع طلبك الآن →
                </Link>
              )}
              {msg.from === 'bot' && msg.type === 'wallet' && (
                <Link href="/customer/wallet" className="inline-block mt-2 text-[10px] text-emerald-400 hover:text-emerald-300">
                  افتح المحفظة →
                </Link>
              )}
              {msg.from === 'bot' && msg.type === 'cart' && (
                <Link href="/customer/catalog" className="inline-block mt-2 text-[10px] text-emerald-400 hover:text-emerald-300">
                  اذهب إلى المتجر →
                </Link>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Queries */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {quickQueries.map((q, i) => (
          <button key={i} onClick={() => handleSend(q.text)}
            className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[10px] text-white/60 whitespace-nowrap hover:bg-white/[0.08] transition-colors flex items-center gap-1">
            <span>{q.icon}</span> {q.text.slice(0, 20)}...
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="sticky bottom-0 bg-[#0A0A0C] pt-2">
        <div className="flex items-center gap-2">
          <button onClick={startListening}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
              isListening ? 'bg-red-500/30 text-red-400 animate-pulse scale-110' : 'bg-white/[0.06] text-white/60 hover:bg-white/[0.1]'
            }`}>
            🎤
          </button>
          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend(input)}
            placeholder="اكتب أو تكلم..."
            className="flex-1 h-11 bg-white/[0.06] border border-white/[0.08] rounded-xl px-4 text-sm text-white outline-none focus:border-emerald-500/50 transition-colors placeholder:text-white/30" />
          <button onClick={() => handleSend(input)}
            disabled={!input.trim()}
            className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
            ➤
          </button>
        </div>
        {isSpeaking && <p className="text-[10px] text-emerald-400 text-center mt-1 animate-pulse">🔊 البوت بيتكلم...</p>}
      </div>
    </div>
  );
}
