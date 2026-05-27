'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Mic, MicOff, TrendingUp, Clock, Package } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';

const popularSearches = ['كوكاكولا', 'حليب', 'خبز', 'بيض', 'ماء', 'أرز', 'سكر', 'زيت'];

export function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
    if (!open) { setQuery(''); setResults([]); setSuggestions([]); }
  }, [open]);

  useEffect(() => {
    if (!query) { setResults([]); setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.products || []);
        setSuggestions(data.suggestions || []);
      } catch {} finally { setIsSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const toggleVoice = () => {
    if (!isListening) {
      if ('webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'ar-EG';
        recognition.onresult = (event: any) => {
          setQuery(event.results[0][0].transcript);
          setIsListening(false);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.start();
        setIsListening(true);
      }
    } else setIsListening(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50" onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-0 left-0 right-0 z-50 bg-background border-b shadow-xl"
          >
            <div className="max-w-2xl mx-auto p-4">
              <div className="flex items-center gap-2 bg-muted rounded-xl px-4">
                <Search className="h-5 w-5 text-muted-foreground shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ابحث عن منتجات... (مثلاً: حليب، خبز، كوكاكولا)"
                  className="flex-1 h-12 bg-transparent border-none outline-none text-base"
                />
                <button onClick={toggleVoice} className="p-2 rounded-lg hover:bg-background">
                  {isListening ? <MicOff className="h-5 w-5 text-red-500" /> : <Mic className="h-5 w-5 text-muted-foreground" />}
                </button>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-background">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Suggestions */}
              {!query && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <TrendingUp className="h-4 w-4" /> الأكثر بحثاً
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {popularSearches.map((s) => (
                      <button key={s} onClick={() => { setQuery(s); }} className="px-3 py-1.5 rounded-full bg-muted hover:bg-accent text-sm transition-colors">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Suggestions */}
              {query && suggestions.length > 0 && !isSearching && (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-2">اقتراحات البحث:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((s, i) => (
                      <button key={i} onClick={() => setQuery(s)} className="px-3 py-1.5 rounded-full bg-primary/5 text-sm hover:bg-primary/10 transition-colors">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Results */}
              {query && (
                <div className="mt-3 max-h-80 overflow-y-auto space-y-2">
                  {isSearching ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full ml-2" />
                      جاري البحث...
                    </div>
                  ) : results.length > 0 ? (
                    results.map((p: any) => (
                      <Link
                        key={p.id}
                        href={`/shop/product/${p.id}`}
                        onClick={onClose}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors"
                      >
                        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{p.nameAr}</p>
                          <p className="text-xs text-muted-foreground">{p.category}</p>
                        </div>
                        <span className="text-sm font-bold text-primary">{formatCurrency(p.price)}</span>
                      </Link>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>لا توجد نتائج لـ &ldquo;{query}&rdquo;</p>
                      <p className="text-sm">حاول استخدام كلمات بحث مختلفة</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
