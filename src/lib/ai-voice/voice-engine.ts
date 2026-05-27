'use client';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';
export type VoiceCommandCallback = (text: string, isFinal: boolean) => void;

class VoiceEngine {
  private recognition: any = null;
  private synthesis: SpeechSynthesis | null = null;
  private state: VoiceState = 'idle';
  private onResult: VoiceCommandCallback | null = null;
  private onStateChange: ((state: VoiceState) => void) | null = null;
  private onError: ((error: string) => void) | null = null;
  private restartTimer: any = null;
  private continuousMode: boolean = false;
  private silenceTimer: any = null;

  get currentState() { return this.state; }
  get isSupported() { return this.checkSupport(); }
  get isListening() { return this.state === 'listening'; }

  private checkSupport(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    );
  }

  configure(config: {
    onResult?: VoiceCommandCallback;
    onStateChange?: (state: VoiceState) => void;
    onError?: (error: string) => void;
    continuous?: boolean;
  }) {
    this.onResult = config.onResult || null;
    this.onStateChange = config.onStateChange || null;
    this.onError = config.onError || null;
    this.continuousMode = config.continuous || false;
  }

  start(): boolean {
    if (!this.checkSupport()) {
      this.onError?.('متصفحك لا يدعم التعرف على الصوت. الرجاء استخدام Chrome أو Edge');
      return false;
    }
    if (this.state === 'listening') return true;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'ar-EG';
    this.recognition.continuous = this.continuousMode;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 5;

    this.recognition.onstart = () => {
      this.setState('listening');
    };

    this.recognition.onresult = (event: any) => {
      // Clear silence timer on any result
      if (this.silenceTimer) clearTimeout(this.silenceTimer);

      let interimText = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }

      // Send interim results for real-time display
      if (interimText) {
        this.onResult?.(interimText, false);
      }

      // Process final results
      if (finalText) {
        this.onResult?.(finalText, true);
        this.setState('processing');

        // Auto-restart in continuous mode after processing
        if (this.continuousMode) {
          this.silenceTimer = setTimeout(() => {
            this.restart();
          }, 1000);
        }
      }

      // In continuous mode, set silence detection
      if (this.continuousMode && !finalText) {
        this.silenceTimer = setTimeout(() => {
          // If no speech detected for 3 seconds, restart
          this.restart();
        }, 3000);
      }
    };

    this.recognition.onerror = (event: any) => {
      const errors: Record<string, string> = {
        'no-speech': 'لم يتم التعرف على صوت، حاول مرة أخرى',
        'aborted': 'تم إلغاء التسجيل',
        'audio-capture': 'الميكروفون غير متاح',
        'network': 'خطأ في الشبكة - تحقق من اتصالك',
        'not-allowed': 'الرجاء السماح بالوصول إلى الميكروفون',
        'service-not-allowed': 'خدمة التعرف على الصوت غير متاحة',
        'bad-grammar': 'خطأ في قواعد اللغة',
        'language-not-supported': 'اللغة العربية غير مدعومة في هذا المتصفح',
      };
      this.onError?.(errors[event.error] || `خطأ: ${event.error}`);
      this.setState('idle');

      // Auto-restart on error in continuous mode
      if (this.continuousMode && event.error !== 'not-allowed' && event.error !== 'service-not-allowed') {
        this.restartTimer = setTimeout(() => this.restart(), 2000);
      }
    };

    this.recognition.onend = () => {
      if (this.state === 'listening') {
        // Unexpected end - restart in continuous mode
        if (this.continuousMode) {
          this.restartTimer = setTimeout(() => this.restart(), 500);
        } else {
          this.setState('idle');
        }
      }
    };

    try {
      this.recognition.start();
      return true;
    } catch (e) {
      this.setState('idle');
      this.onError?.('فشل بدء التسجيل الصوتي');
      return false;
    }
  }

  stop() {
    if (this.restartTimer) clearTimeout(this.restartTimer);
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    if (this.recognition && this.state === 'listening') {
      try { this.recognition.stop(); } catch {}
    }
    this.setState('idle');
  }

  restart() {
    this.stop();
    setTimeout(() => this.start(), 300);
  }

  destroy() {
    this.stop();
    this.onResult = null;
    this.onStateChange = null;
    this.onError = null;
  }

  // ===== TEXT-TO-SPEECH =====
  speak(text: string, lang: string = 'ar-EG'): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synthesis) this.synthesis = window.speechSynthesis;
      this.synthesis?.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.onstart = () => this.setState('speaking');
      utterance.onend = () => { this.setState('idle'); resolve(); };
      utterance.onerror = () => { this.setState('idle'); resolve(); };
      this.synthesis?.speak(utterance);
    });
  }

  cancelSpeech() {
    this.synthesis?.cancel();
    if (this.state === 'speaking') this.setState('idle');
  }

  private setState(state: VoiceState) {
    this.state = state;
    this.onStateChange?.(state);
  }
}

export const voiceEngine = new VoiceEngine();

export function isVoiceSupported(): boolean {
  return voiceEngine.isSupported;
}
