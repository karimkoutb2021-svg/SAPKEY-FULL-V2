'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';

export interface VoiceCommand {
  keywords: string[];
  action: (transcript: string, match: string) => void;
  priority?: number;
}

interface UseVoiceAssistantOptions {
  commands?: VoiceCommand[];
  onSearch?: (query: string) => void;
  onResult?: (transcript: string) => void;
  language?: string;
  continuous?: boolean;
  autoRestart?: boolean;
}

interface UseVoiceAssistantReturn {
  isListening: boolean;
  interimText: string;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  isSupported: boolean;
}

const EGYPTIAN_ARABIC_NORMALIZATIONS: [RegExp, string][] = [
  [/\s+/g, ' '],
  [/[أإآٱ]/g, 'ا'],
  [/ة/g, 'ه'],
  [/ى/g, 'ي'],
  [/[ؤئ]/g, 'ء'],
  [/\u0640/g, ''], // tatweel
  [/^\s+|\s+$/g, ''],
];

function normalizeArabic(text: string): string {
  let result = text.toLowerCase();
  for (const [pattern, replacement] of EGYPTIAN_ARABIC_NORMALIZATIONS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function matchKeywords(transcript: string, keywords: string[]): string | null {
  const normalized = normalizeArabic(transcript);
  for (const keyword of keywords) {
    const normalizedKeyword = normalizeArabic(keyword);
    if (normalized.includes(normalizedKeyword)) {
      return keyword;
    }
  }
  return null;
}

const DEFAULT_COMMANDS: VoiceCommand[] = [
  {
    keywords: ['تعليق', 'hold', 'علق', 'حفظ الفاتورة'],
    action: (transcript, match) => {
      toast.success('تم تعليق الفاتورة', { duration: 3000 });
    },
    priority: 10,
  },
  {
    keywords: ['رصيد', 'كام', 'كم', 'المخزون', 'stock'],
    action: (transcript, match) => {
      toast.success('جاري البحث عن الرصيد...', { duration: 3000 });
    },
    priority: 10,
  },
  {
    keywords: ['فاتورة', 'بيع', 'checkout', 'دفع'],
    action: (transcript, match) => {
      toast.success('جاري إتمام البيع...', { duration: 3000 });
    },
    priority: 10,
  },
  {
    keywords: ['محفظ', 'رصيد المحفظة', 'wallet', 'كام في المحفظة'],
    action: (transcript, match) => {
      toast.success('جاري عرض رصيد المحفظة...', { duration: 3000 });
    },
    priority: 10,
  },
  {
    keywords: ['نقط', 'ولاء', 'loyalty', 'كام نقطة'],
    action: (transcript, match) => {
      toast.success('جاري عرض نقاط الولاء...', { duration: 3000 });
    },
    priority: 10,
  },
  {
    keywords: ['اعيد', 'نفس الطلب', 'repeat', 'تكرار'],
    action: (transcript, match) => {
      toast.success('جاري تكرار آخر طلب...', { duration: 3000 });
    },
    priority: 10,
  },
  {
    keywords: ['يصل', 'يوصل', 'قد ايه', 'كام دقيقة', 'متى', 'delivery'],
    action: (transcript, match) => {
      toast.success('الطلب بيتجهز وهيجيلك خلال 45 دقيقة بالظبط يا فندم', { duration: 5000 });
    },
    priority: 10,
  },
  {
    keywords: ['سعر', 'كام بكام', 'price', 'تخفيض', 'خصم'],
    action: (transcript, match) => {
      toast.success('جاري البحث عن الأسعار...', { duration: 3000 });
    },
    priority: 5,
  },
  {
    keywords: ['عربيات', 'عربية', 'cart', 'السلة', 'سله'],
    action: (transcript, match) => {
      toast.success('جاري عرض السلة...', { duration: 3000 });
    },
    priority: 10,
  },
];

export function useVoiceAssistant(options: UseVoiceAssistantOptions = {}): UseVoiceAssistantReturn {
  const {
    commands = DEFAULT_COMMANDS,
    onSearch,
    onResult,
    language = 'ar-EG',
    continuous = false,
    autoRestart = true,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<any>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const isSupported = typeof window !== 'undefined' && (
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      recognitionRef.current?.stop();
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    };
  }, []);

  const processTranscript = useCallback((transcript: string) => {
    const normalizedTranscript = transcript.toLowerCase();

    // Sort commands by priority (higher first)
    const sortedCommands = [...commands].sort((a, b) => (b.priority || 0) - (a.priority || 0));

    for (const command of sortedCommands) {
      const match = matchKeywords(normalizedTranscript, command.keywords);
      if (match) {
        command.action(normalizedTranscript, match);
        return;
      }
    }

    // No command matched - treat as search
    if (onSearch) {
      onSearch(transcript);
    } else if (onResult) {
      onResult(transcript);
    } else {
      toast.success(`جاري البحث عن: ${transcript}`, { duration: 3000 });
    }
  }, [commands, onSearch, onResult]);

  const startRecognition = useCallback(() => {
    if (!isSupported) {
      toast.error('المتصفح لا يدعم البحث الصوتي');
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.lang = language;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;
      recognition.continuous = continuous;

      recognition.onstart = () => {
        if (isMountedRef.current) {
          setIsListening(true);
          setInterimText('');
        }
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;

          if (result.isFinal) {
            finalTranscript += transcript;
          } else {
            interim += transcript;
          }
        }

        if (interim) {
          setInterimText(interim);
        }

        if (finalTranscript) {
          processTranscript(finalTranscript);
          if (!continuous && isMountedRef.current) {
            setIsListening(false);
            setInterimText('');
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);

        if (event.error === 'not-allowed') {
          toast.error('السماح بالمايكروفون من إعدادات المتصفح', { duration: 4000 });
        } else if (event.error === 'no-speech') {
          toast.error('مفيش صوت، حاول تاني', { duration: 3000 });
        } else if (event.error === 'network') {
          toast.error('مشكلة في الاتصال بالنت', { duration: 3000 });
        } else if (event.error !== 'aborted') {
          toast.error('مش فهمتك، حاول تاني', { duration: 3000 });
        }

        if (isMountedRef.current) {
          setIsListening(false);
          setInterimText('');
        }
      };

      recognition.onend = () => {
        if (isMountedRef.current) {
          setIsListening(false);
          setInterimText('');

          // Auto-restart if continuous mode and not manually stopped
          if (continuous && autoRestart && isMountedRef.current) {
            restartTimeoutRef.current = setTimeout(() => {
              if (isMountedRef.current && isListening) {
                startRecognition();
              }
            }, 500);
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      toast.error('مشكلة في تشغيل المساعد الصوتي');
      setIsListening(false);
    }
  }, [isSupported, language, continuous, autoRestart, processTranscript, isListening]);

  const stopListening = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    recognitionRef.current?.stop();
    if (isMountedRef.current) {
      setIsListening(false);
      setInterimText('');
    }
  }, []);

  const startListening = useCallback(() => {
    if (!isListening) {
      startRecognition();
    }
  }, [isListening, startRecognition]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    interimText,
    startListening,
    stopListening,
    toggleListening,
    isSupported,
  };
}
