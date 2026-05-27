'use client';

/**
 * ═══════════════════════════════════════════════════════════
 *  ماسح QR موحد - يعمل بدون إنترنت
 *  Unified QR Scanner - Offline-First
 * ═══════════════════════════════════════════════════════════
 * 
 * يستخدم مكتبة html5-qrcode لمسح أكواد QR من الكاميرا الخلفية
 * مع دعم كامل للنصوص العربية والإنجليزية
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Loader2 } from 'lucide-react';

interface ScannerResult {
  rawValue: string;
  decodedValue: string;
  format: string;
}

interface UnifiedScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (result: ScannerResult) => void;
  mode?: 'qr' | 'barcode';
}

/**
 * فك تشفير النص الممسوح - يدعم العربية والإنجليزية 100%
 * Decodes scanned text with full Arabic/English support
 */
function decodeScannedText(rawText: string): string {
  try {
    // TextDecoder مع UTF-8 (الطريقة الصحيحة للعربية)
    const bytes = Uint8Array.from(rawText, c => c.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch {
    try {
      // Fallback: binary UTF-8 decode
      const buf = new ArrayBuffer(rawText.length);
      const view = new Uint8Array(buf);
      for (let i = 0; i < rawText.length; i++) view[i] = rawText.charCodeAt(i) & 0xff;
      return new TextDecoder('utf-8', { fatal: false }).decode(view);
    } catch {
      return rawText;
    }
  }
}

/**
 * تحليل محتوى QR وعرضه بشكل واضح
 * Parse QR content for user-friendly display
 */
function parseQRContent(decoded: string): string {
  // Product JSON from printed labels
  if (decoded.startsWith('{') && (decoded.includes('"sku"') || decoded.includes('"name"') || decoded.includes('"price"'))) {
    try {
      const data = JSON.parse(decoded);
      const parts: string[] = [];
      if (data.name || data.name_ar) parts.push(`منتج: ${data.name_ar || data.name}`);
      if (data.sku || data.barcode) parts.push(`كود: ${data.sku || data.barcode}`);
      if (data.price || data.sale_price) parts.push(`${data.price || data.sale_price} ج.م`);
      if (data.stock !== undefined) parts.push(`مخزون: ${data.stock}`);
      return parts.join(' | ');
    } catch { /* fall through to other parsers */ }
  }
  // VCARD - جهة اتصال
  if (decoded.startsWith('BEGIN:VCARD')) {
    const nameMatch = decoded.match(/FN[:;]([^\n\r]+)/);
    const orgMatch = decoded.match(/ORG[:;]([^\n\r]+)/);
    const telMatch = decoded.match(/TEL[^:]*:([^\n\r]+)/);
    const parts: string[] = [];
    if (nameMatch) parts.push(nameMatch[1].trim());
    if (orgMatch) parts.push(orgMatch[1].trim());
    if (telMatch) parts.push(telMatch[1].trim());
    return parts.length > 0 ? `جهة اتصال: ${parts.join(' - ')}` : 'جهة اتصال';
  }
  // URL - رابط (يشمل النطاقات بدون http/https)
  const isUrl = decoded.startsWith('http://') || decoded.startsWith('https://') || decoded.startsWith('www.') ||
    /^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}/.test(decoded);
  if (isUrl) {
    try {
      const urlStr = decoded.startsWith('www.') ? 'https://' + decoded :
        decoded.startsWith('http') ? decoded : 'https://' + decoded;
      const url = new URL(urlStr);
      return `رابط: ${url.hostname}${url.pathname !== '/' ? url.pathname : ''}`;
    } catch {
      return `رابط: ${decoded.substring(0, 50)}`;
    }
  }
  // Email - بريد إلكتروني
  if (decoded.startsWith('mailto:') || decoded.includes('@')) {
    const email = decoded.replace('mailto:', '');
    return `بريد: ${email}`;
  }
  // Phone - رقم هاتف
  if (/^[\+]?[\d\s\-]{7,}$/.test(decoded)) {
    return `رقم: ${decoded}`;
  }
  // WiFi
  if (decoded.startsWith('WIFI:')) {
    const ssid = decoded.match(/S:([^;]+)/);
    return `واي فاي: ${ssid ? ssid[1] : decoded.substring(5, 20)}`;
  }
  // نص عادي - تقصير إذا كان طويل
  if (decoded.length > 50) {
    return decoded.substring(0, 50) + '...';
  }
  return decoded;
}

export function UnifiedScanner({ isOpen, onClose, onScan, mode = 'qr' }: UnifiedScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string>('');
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);

  // تحديث المراجع لتجنب المشاكل مع closures
  onScanRef.current = onScan;
  onCloseRef.current = onClose;

  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch(() => {});
        }
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
    setIsStarting(false);
    setError('');
  }, []);

  const handleClose = useCallback(() => {
    stopScanner();
    onCloseRef.current();
  }, [stopScanner]);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    let cancelled = false;

    const start = async () => {
      setIsStarting(true);
      setError('');

      try {
        // إنشاء ماسح جديد
        const scanner = new Html5Qrcode('qr-scanner-container', {
          verbose: false,
          formatsToSupport: mode === 'qr'
            ? [Html5QrcodeSupportedFormats.QR_CODE]
            : [
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.CODE_39,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E,
                Html5QrcodeSupportedFormats.CODABAR,
                Html5QrcodeSupportedFormats.ITF,
              ],
        });

        scannerRef.current = scanner;

        // محاولة استخدام الكاميرا الخلفية
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          // البحث عن الكاميرا الخلفية
          const backCamera = cameras.find(c =>
            c.label.toLowerCase().includes('back') ||
            c.label.toLowerCase().includes('rear') ||
            c.label.toLowerCase().includes('environment') ||
            c.label.toLowerCase().includes('خلفي')
          );
          
          const cameraId = backCamera ? backCamera.id : cameras[cameras.length - 1].id;
          
          if (cancelled) return;

          await scanner.start(
            cameraId,
            {
              fps: 15,
              qrbox: { width: 280, height: 280 },
              aspectRatio: 1.0,
              disableFlip: false,
            },
            // نجاح المسح
            (decodedText) => {
              const decoded = decodeScannedText(decodedText);
              stopScanner();
              onScanRef.current({
                rawValue: decodedText,
                decodedValue: decoded,
                format: mode,
              });
            },
            // فشل المسح (طبيعي - يستمر في المحاولة)
            () => {}
          );
        } else {
          setError('لا توجد كاميرا متاحة');
        }
      } catch (err: any) {
        console.error('Scanner error:', err);
        if (err.name === 'NotAllowedError') {
          setError('يرجى السماح بالوصول إلى الكاميرا');
        } else if (err.name === 'NotFoundError') {
          setError('لا توجد كاميرا على هذا الجهاز');
        } else {
          setError('تعذر تشغيل الكاميرا: ' + (err.message || 'خطأ غير معروف'));
        }
      } finally {
        if (!cancelled) setIsStarting(false);
      }
    };

    start();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [isOpen, mode, stopScanner]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/90 flex items-center justify-center">
      <div className="relative w-full max-w-md mx-4">
        {/* زر الإغلاق */}
        <button
          onClick={handleClose}
          className="absolute -top-12 left-0 h-10 w-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors"
        >
          <X size={20} />
        </button>

        {/* عنوان */}
        <h3 className="text-white text-center text-lg font-bold mb-4">
          {mode === 'qr' ? 'مسح رمز QR' : 'مسح الباركود'}
        </h3>

        {/* حاوية الماسح */}
        <div
          id="qr-scanner-container"
          ref={containerRef}
          className="rounded-2xl overflow-hidden bg-black shadow-2xl"
          style={{ width: '100%', aspectRatio: '1/1' }}
        />

        {/* حالة التحميل */}
        {isStarting && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
              <span className="text-white text-sm">جاري تشغيل الكاميرا...</span>
            </div>
          </div>
        )}

        {/* رسالة الخطأ */}
        {error && (
          <div className="mt-4 p-4 rounded-xl bg-red-500/20 border border-red-500/30">
            <p className="text-red-300 text-sm text-center">{error}</p>
          </div>
        )}

        {/* تعليمات */}
        {!isStarting && !error && (
          <p className="text-white/60 text-center text-xs mt-4">
            وجّه الكاميرا نحو {mode === 'qr' ? 'رمز QR' : 'الباركود'}
          </p>
        )}
      </div>
    </div>
  );
}

// Export utilities for use in other modules
export { decodeScannedText, parseQRContent, handleQRAction };
export type { ScannerResult };

/**
 * Handle smart actions based on QR content (e.g. open links)
 */
function handleQRAction(decoded: string): boolean {
  const isUrl = decoded.startsWith('http://') || decoded.startsWith('https://') || decoded.startsWith('www.') ||
    /^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}/.test(decoded);
    
  if (isUrl) {
    const urlStr = decoded.startsWith('www.') ? 'https://' + decoded :
      decoded.startsWith('http') ? decoded : 'https://' + decoded;
    window.open(urlStr, '_blank');
    return true;
  }
  
  if (decoded.startsWith('mailto:') || decoded.startsWith('tel:')) {
    window.open(decoded, '_self');
    return true;
  }
  
  return false;
}
