'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Headphones, CheckCircle, AlertCircle, Loader2, ShoppingCart, X } from 'lucide-react';
import { voiceEngine, isVoiceSupported } from '@/lib/ai-voice/voice-engine';
import { parseVoiceOrder, defaultProducts, generateConfirmationMessage } from '@/lib/ai-voice/order-parser';
import toast from 'react-hot-toast';

interface VoiceOrderWidgetProps {
  onItemsParsed: (items: Array<{ productId: string; name: string; nameAr: string; price: number; quantity: number; unit: string }>) => void;
  onClose?: () => void;
  mini?: boolean;
}

export function VoiceOrderWidget({ onItemsParsed, onClose, mini = false }: VoiceOrderWidgetProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [processing, setProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    voiceEngine.configure({
      onResult: (text, isFinal) => {
        if (isFinal) {
          setTranscript(text);
          processText(text);
        } else {
          setInterimText(text);
        }
      },
      onStateChange: (state) => {
        setIsListening(state === 'listening');
      },
      onError: (error) => {
        toast.error(error);
      },
    });

    return () => { voiceEngine.stop(); };
  }, []);

  const processText = (text: string) => {
    setProcessing(true);
    setTimeout(() => {
      const parsed = parseVoiceOrder(text, defaultProducts);
      if (parsed.items.length > 0) {
        const items = parsed.items.map((item) => {
          const product = defaultProducts.find((p) => p.nameAr === item.productName);
          return {
            productId: product?.id || '',
            name: product?.name || item.productName,
            nameAr: product?.nameAr || item.productName,
            price: product?.price || 0,
            quantity: item.unit === 'kg' && item.weight ? item.weight : item.quantity,
            unit: item.unit,
          };
        }).filter((i) => i.productId);
        if (items.length > 0) {
          onItemsParsed(items);
          const msg = generateConfirmationMessage(parsed);
          setConfirmation(msg);
          voiceEngine.speak(msg);
        }
      }
      setProcessing(false);
    }, 500);
  };

  const toggleListening = () => {
    if (isListening) {
      voiceEngine.stop();
    } else if (isVoiceSupported()) {
      voiceEngine.start();
    } else {
      toast.error('المتصفح لا يدعم التعرف على الصوت');
    }
  };

  if (mini) {
    return (
      <div className="relative">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={toggleListening}
          className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${
            isListening ? 'bg-red-500 text-white shadow-lg' : 'bg-primary text-primary-foreground'
          }`}
          title="أمر صوتي"
        >
          {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </motion.button>

        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute top-12 left-1/2 -translate-x-1/2 bg-background border rounded-xl shadow-xl p-3 w-64 z-50"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-medium">استمع...</span>
              </div>
              {interimText && <p className="text-sm text-muted-foreground">{interimText}</p>}
              {confirmation && (
                <div className="flex items-center gap-1 text-xs text-emerald-600 mt-1">
                  <CheckCircle className="h-3 w-3" /> {confirmation}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={toggleListening}
        className={`h-16 w-16 rounded-full flex items-center justify-center shadow-2xl transition-all ${
          isListening
            ? 'bg-red-500 text-white shadow-red-500/40'
            : 'bg-primary text-primary-foreground hover:bg-primary/90'
        }`}
      >
        {isListening ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
      </motion.button>

      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="absolute bottom-20 left-0 bg-background border rounded-2xl shadow-2xl p-4 w-80"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Headphones className="h-5 w-5 text-primary" />
                <span className="font-semibold">الطلب الصوتي</span>
              </div>
              {onClose && (
                <button onClick={onClose} className="p-1 rounded-lg hover:bg-accent">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 justify-center mb-3 h-6">
              {Array.from({ length: 20 }).map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ height: [3, 6, 12, 18, 12, 6, 3] }}
                  transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.05 }}
                  className="w-0.5 bg-primary/40 rounded-full"
                />
              ))}
            </div>

            <p className="text-center text-sm text-muted-foreground">
              {interimText || 'تحدث الآن...'}
            </p>

            {processing && (
              <div className="flex items-center justify-center gap-2 mt-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> جاري المعالجة...
              </div>
            )}

            {confirmation && (
              <div className="flex items-center justify-center gap-2 mt-2 text-sm text-emerald-600">
                <CheckCircle className="h-4 w-4" /> {confirmation}
              </div>
            )}

            <button
              onClick={toggleListening}
              className="w-full mt-3 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
            >
              إيقاف التسجيل
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
