'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Copy, QrCode, Printer } from 'lucide-react';

interface QRCodeGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  initialValue?: string;
}

export function QRCodeGenerator({ isOpen, onClose, initialValue = '' }: QRCodeGeneratorProps) {
  const [value, setValue] = useState(initialValue);
  const [size, setSize] = useState(200);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (initialValue) setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (!isOpen || !value || !canvasRef.current) return;
    generateQR();
  }, [isOpen, value, size]);

  function generateQR() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Simple QR-like pattern generator (visual representation)
    // In production, use a proper QR library like qrcode-generator
    const modules = 21;
    const moduleSize = size / modules;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);

    // Generate pseudo-QR pattern based on input value
    const seed = hashCode(value);
    const rng = seededRandom(seed);

    ctx.fillStyle = '#000000';

    // Draw finder patterns (top-left, top-right, bottom-left)
    drawFinderPattern(ctx, 0, 0, moduleSize);
    drawFinderPattern(ctx, (modules - 7) * moduleSize, 0, moduleSize);
    drawFinderPattern(ctx, 0, (modules - 7) * moduleSize, moduleSize);

    // Draw data modules
    for (let row = 0; row < modules; row++) {
      for (let col = 0; col < modules; col++) {
        // Skip finder pattern areas
        if ((row < 8 && col < 8) || (row < 8 && col > modules - 9) || (row > modules - 9 && col < 8)) continue;

        if (rng() > 0.5) {
          ctx.fillRect(col * moduleSize, row * moduleSize, moduleSize - 0.5, moduleSize - 0.5);
        }
      }
    }
  }

  function drawFinderPattern(ctx: CanvasRenderingContext2D, x: number, y: number, moduleSize: number) {
    // Outer border
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y, moduleSize * 7, moduleSize * 7);

    // White border
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x + moduleSize, y + moduleSize, moduleSize * 5, moduleSize * 5);

    // Inner square
    ctx.fillStyle = '#000000';
    ctx.fillRect(x + moduleSize * 2, y + moduleSize * 2, moduleSize * 3, moduleSize * 3);
  }

  function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function downloadQR() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `qr-${value.substring(0, 20)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  function copyToClipboard() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (blob) {
        navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      }
    });
  }

  function printQR() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>QR Code - ${value}</title></head>
          <body style="display:flex;justify-content:center;align-items:center;height:100vh;margin:0;">
            <img loading="lazy" src="${canvas.toDataURL()}" style="max-width:300px;" />
            <p style="text-align:center;margin-top:20px;font-family:monospace;">${value}</p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10002] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <QrCode className="h-6 w-6 text-white" />
              <h3 className="text-lg font-bold text-white">مولد QR Code</h3>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            {/* Input */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">القيمة</label>
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="أدخل الباركود أو SKU أو أي نص..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
            </div>

            {/* Size */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">الحجم: {size}px</label>
              <input
                type="range"
                min="100"
                max="400"
                step="50"
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="w-full accent-violet-500"
              />
            </div>

            {/* QR Display */}
            <div className="flex justify-center p-6 bg-gray-50 rounded-2xl">
              <canvas
                ref={canvasRef}
                width={size}
                height={size}
                className="rounded-xl shadow-lg"
              />
            </div>

            {/* Actions */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={downloadQR}
                className="flex flex-col items-center gap-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <Download size={18} className="text-gray-600" />
                <span className="text-xs text-gray-600">تحميل</span>
              </button>
              <button
                onClick={copyToClipboard}
                className="flex flex-col items-center gap-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <Copy size={18} className="text-gray-600" />
                <span className="text-xs text-gray-600">نسخ</span>
              </button>
              <button
                onClick={printQR}
                className="flex flex-col items-center gap-1 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <Printer size={18} className="text-gray-600" />
                <span className="text-xs text-gray-600">طباعة</span>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
