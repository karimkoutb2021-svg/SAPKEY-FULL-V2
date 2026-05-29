'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Webcam from 'react-webcam';
import Tesseract from 'tesseract.js';
import { X, Camera, RefreshCw, Check, AlertTriangle, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

interface OCRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (text: string) => void;
  title?: string;
  expectedPattern?: RegExp;
}

export function OCRScanner({ isOpen, onClose, onScan, title = 'مسح كشف الجرد الضوئي', expectedPattern }: OCRScannerProps) {
  const webcamRef = useRef<Webcam>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scannedText, setScannedText] = useState<string | null>(null);

  const captureAndScan = useCallback(async () => {
    if (!webcamRef.current) return;
    
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      toast.error('لم يتم العثور على الكاميرا');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setScannedText(null);

    try {
      const result = await Tesseract.recognize(
        imageSrc,
        'eng', // Using English since we mostly scan numbers (quantities, barcodes)
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              setProgress(Math.round(m.progress * 100));
            }
          }
        }
      );

      let text = result.data.text.trim();
      
      // If we're looking for numbers (like inventory quantities), filter out noise
      const numericMatches = text.match(/\d+/g);
      if (numericMatches) {
        text = numericMatches.join('');
      }

      setScannedText(text);

      if (expectedPattern && !expectedPattern.test(text)) {
        toast.error('القيمة المقروءة غير مطابقة للنمط المطلوب');
      } else if (text) {
        toast.success(`تمت القراءة بنجاح: ${text}`);
        setTimeout(() => {
          onScan(text);
        }, 1000);
      } else {
        toast.error('لم يتم التعرف على أي نصوص');
      }
    } catch (err) {
      console.error(err);
      toast.error('فشل في معالجة الصورة');
    } finally {
      setIsProcessing(false);
    }
  }, [onScan, expectedPattern]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm"
        dir="rtl"
      >
        <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
              <ScanLine className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-white font-bold">{title}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative flex-1 flex items-center justify-center overflow-hidden">
          {!scannedText ? (
            <div className="relative w-full max-w-md aspect-[3/4] sm:aspect-[4/3] md:aspect-video rounded-3xl overflow-hidden bg-gray-900 border border-white/10 shadow-2xl">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: 'environment' }}
                className="w-full h-full object-cover"
              />
              
              {/* Dynamic Bounding Box UI */}
              <div className="absolute inset-0 border-[100px] border-black/40 mix-blend-hard-light pointer-events-none">
                <div className="absolute inset-0 border-2 border-emerald-500/50 flex flex-col items-center justify-center">
                  <div className="w-full h-1 bg-emerald-500/50 animate-scan pointer-events-none" />
                  <p className="absolute bottom-4 text-white/80 text-xs font-bold bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">
                    وجه الكاميرا نحو الرقم المكتوب بخط اليد
                  </p>
                </div>
                {/* Corner markers */}
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500 -mt-1 -mr-1 rounded-tr-lg" />
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500 -mt-1 -ml-1 rounded-tl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500 -mb-1 -mr-1 rounded-br-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500 -mb-1 -ml-1 rounded-bl-lg" />
              </div>

              {/* Processing Overlay */}
              {isProcessing && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                  <RefreshCw className="w-12 h-12 text-emerald-400 animate-spin mb-4" />
                  <p className="text-white font-bold mb-2">جاري المعالجة (OCR)...</p>
                  <div className="w-48 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-emerald-400 text-xs mt-2 font-mono">{progress}%</p>
                </div>
              )}
            </div>
          ) : (
            /* Result View */
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl max-w-sm w-full mx-4 text-center"
            >
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-emerald-400" />
              </div>
              <p className="text-gray-400 text-sm mb-2">الكمية المقروءة</p>
              <h3 className="text-5xl font-black text-white mb-8 font-mono">{scannedText}</h3>
              
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setScannedText(null)} className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10">
                  <RefreshCw className="w-4 h-4 ml-2" /> إعادة المسح
                </Button>
                <Button onClick={() => onScan(scannedText)} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white">
                  <Check className="w-4 h-4 ml-2" /> تأكيد
                </Button>
              </div>
            </motion.div>
          )}
        </div>

        {!isProcessing && !scannedText && (
          <div className="p-6 pb-safe bg-gradient-to-t from-black to-transparent flex justify-center">
            <button
              onClick={captureAndScan}
              className="w-20 h-20 rounded-full bg-white/10 border-4 border-white flex items-center justify-center hover:bg-white/20 transition-all active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.3)]"
            >
              <Camera className="w-8 h-8 text-white" />
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
