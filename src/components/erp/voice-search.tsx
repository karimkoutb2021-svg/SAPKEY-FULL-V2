'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

interface VoiceSearchProps {
  onResult: (product: {
    id: string;
    name_ar: string;
    name_en: string | null;
    sku: string;
    barcode: string | null;
    sale_price: number;
    cost_price: number;
    unit: string;
    current_stock: number;
  }) => void;
  placeholder?: string;
  language?: 'ar' | 'en';
}

export function VoiceSearch({ onResult, placeholder = 'بحث صوتي...', language = 'ar' }: VoiceSearchProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{
    id: string;
    name_ar: string;
    name_en: string | null;
    sku: string;
    barcode: string | null;
    sale_price: number;
    cost_price: number;
    unit: string;
    current_stock: number;
  }>>([]);
  const [showResults, setShowResults] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = language === 'ar' ? 'ar-EG' : 'en-US';

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

for (let i = (event as unknown as { resultIndex: number }).resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setSearchQuery(finalTranscript);
          searchProducts(finalTranscript);
        }
      };

      (recognitionRef.current as unknown as { onerror: (event: unknown) => void }).onerror = (event) => {
        console.error('Speech recognition error:', (event as { error: string }).error);
        setIsListening(false);
      };

      (recognitionRef.current as unknown as { onend: () => void }).onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [language]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Error starting recognition:', error);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const searchProducts = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    const field = language === 'ar' ? 'name_ar' : 'name_en';
    
    const { data, error } = await supabase
      .from('products')
      .select('id, name_ar, name_en, sku, barcode, sale_price, cost_price, unit, current_stock')
      .ilike(field, `%${query}%`)
      .eq('is_active', true)
      .limit(10);

    if (!error && data) {
      setSearchResults(data);
      setShowResults(true);
    }
  }, [language]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    searchProducts(value);
  };

  const handleSelectProduct = (product: typeof searchResults[0]) => {
    onResult(product);
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={placeholder}
            className="pr-10"
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
                setShowResults(false);
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
        {isSupported && (
          <Button
            type="button"
            variant={isListening ? 'destructive' : 'outline'}
            size="icon"
            onClick={isListening ? stopListening : startListening}
            className={isListening ? 'animate-pulse' : ''}
          >
            {isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {showResults && searchResults.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {searchResults.map((product) => (
            <button
              key={product.id}
              onClick={() => handleSelectProduct(product)}
              className="w-full p-3 text-right hover:bg-accent/50 border-b last:border-b-0 flex items-center justify-between"
            >
              <div>
                <p className="font-medium">{product.name_ar}</p>
                <p className="text-xs text-muted-foreground">{product.sku}</p>
              </div>
              <div className="text-left">
                <p className="font-bold text-primary">{product.sale_price} ج.م</p>
                <p className="text-xs text-muted-foreground">المخزون: {product.current_stock}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {showResults && searchQuery && searchResults.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background border rounded-lg shadow-lg z-50 p-4 text-center text-muted-foreground">
          لا توجد نتائج
        </div>
      )}
    </div>
  );
}

export function useVoiceSearch() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [isSupported] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  });

  const startListening = useCallback((language: 'ar' | 'en' = 'ar') => {
    if (!isSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.lang = language === 'ar' ? 'ar-EG' : 'en-US';
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;

    recognitionRef.current.onresult = (event: unknown) => {
      const e = event as { resultIndex: number; results: { isFinal: boolean; 0: { transcript: string } }[] };
      let finalTranscript = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalTranscript += e.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setTranscript(finalTranscript);
      }
    };

    (recognitionRef.current as unknown as { onstart: () => void }).onstart = () => setIsListening(true);
    (recognitionRef.current as unknown as { onend: () => void }).onend = () => setIsListening(false);
    (recognitionRef.current as unknown as { onerror: () => void }).onerror = () => setIsListening(false);

    try {
      recognitionRef.current.start();
    } catch (error) {
      console.error('Error starting speech recognition:', error);
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  return {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
    resetTranscript: () => setTranscript('')
  };
}