'use client';

export type VoiceCommandCallback = (text: string) => void;

let recognition: any = null;
let isListening = false;

export function startVoiceRecognition(
  onResult: VoiceCommandCallback,
  onError?: (error: string) => void,
  onEnd?: () => void
): void {
  if (isListening) return;

  // Check microphone permission first
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(() => {
      // Permission granted - proceed
    }).catch((err) => {
      isListening = false;
      if (err.name === 'NotAllowedError') {
        onError?.('يرجى السماح بالوصول إلى الميكروفون من إعدادات الموقع');
      } else {
        onError?.('الميكروفون غير متاح');
      }
      return;
    });
  }

  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    onError?.('المتصفح لا يدعم الأوامر الصوتية. استخدم Chrome أو Edge');
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = 'ar-EG';
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 5;

  recognition.onstart = () => { isListening = true; };

  recognition.onresult = (event: any) => {
    let finalText = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        finalText += event.results[i][0].transcript;
      }
    }
    if (finalText) {
      onResult(finalText);
    }
  };

  recognition.onerror = (event: any) => {
    isListening = false;
    const errors: Record<string, string> = {
      'no-speech': 'لم يتم التعرف على صوت، حاول مرة أخرى',
      'aborted': 'تم إلغاء التسجيل',
      'audio-capture': 'الميكروفون غير متاح',
      'network': 'خطأ في الشبكة',
      'not-allowed': 'يرجى السماح بالوصول إلى الميكروفون من إعدادات المتصفح',
      'service-not-allowed': 'خدمة التعرف على الصوت غير متاحة حالياً',
    };
    onError?.(errors[event.error] || 'خطأ في التعرف على الصوت');
  };

  recognition.onend = () => {
    isListening = false;
    onEnd?.();
  };

  try {
    recognition.start();
  } catch {
    isListening = false;
    onError?.('فشل بدء التسجيل الصوتي');
  }
}

export function stopVoiceRecognition(): void {
  if (recognition && isListening) {
    try { recognition.stop(); } catch {}
    isListening = false;
  }
}

export function isVoiceSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;
}

export function parseVoiceOrder(text: string): { action: string; product?: string; quantity?: number } {
  const cleaned = text.trim();

  // Pattern: "أضف 3 كوكاكولا" or "3 كوكاكولا" or "كوكاكولا"
  const quantityMatch = cleaned.match(/^(\d+)\s*(.+)/);
  if (quantityMatch) {
    return { action: 'add', product: quantityMatch[2], quantity: parseInt(quantityMatch[1]) };
  }

  // Pattern: "أضف كوكاكولا"
  const addMatch = cleaned.match(/^(أضف|ضيف|حط|دير)\s+(.+)/);
  if (addMatch) {
    return { action: 'add', product: addMatch[2], quantity: 1 };
  }

  // Pattern: "شيل" or "احذف" + product
  const removeMatch = cleaned.match(/^(شيل|احذف|مسح)\s+(.+)/);
  if (removeMatch) {
    return { action: 'remove', product: removeMatch[2] };
  }

  // Default: treat as product name with quantity 1
  return { action: 'add', product: cleaned, quantity: 1 };
}
