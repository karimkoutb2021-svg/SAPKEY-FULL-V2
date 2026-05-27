'use client';

// Barcode scanning via keyboard wedge (hardware scanners act as keyboard)
// and camera-based scanning via the Barcode Detection API

export function initBarcodeScanner(onBarcode: (barcode: string) => void): () => void {
  let buffer = '';
  let lastKeyTime = 0;
  const TIMEOUT = 100; // ms between keystrokes to consider as scanner input

  const handler = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) return;

    const now = Date.now();
    if (now - lastKeyTime > TIMEOUT) buffer = '';
    lastKeyTime = now;

    if (e.key === 'Enter') {
      if (buffer.length >= 4) {
        onBarcode(buffer);
      }
      buffer = '';
      return;
    }

    if (e.key.length === 1) buffer += e.key;
  };

  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}

// Camera-based scanning using Barcode Detection API
// Request camera permission with proper error handling
async function requestCameraPermission(): Promise<MediaStream | null> {
  try {
    // Check if permission API is available
    if (navigator.permissions && (navigator.permissions as any).query) {
      try {
        const perm = await (navigator.permissions as any).query({ name: 'camera' });
        if (perm.state === 'denied') {
          throw new Error('camera_denied');
        }
      } catch {}
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: 640, height: 480 },
    });
    return stream;
  } catch (err: any) {
    if (err?.name === 'NotAllowedError' || err?.message === 'camera_denied') {
      throw new Error('camera_denied');
    }
    if (err?.name === 'NotFoundError') {
      throw new Error('camera_not_found');
    }
    throw err;
  }
}

export async function scanBarcodeCamera(): Promise<string | null> {
  try {
    if (!('BarcodeDetector' in window)) {
      throw new Error('BarcodeDetector not supported');
    }

    const stream = await requestCameraPermission();
    if (!stream) return null;

    const video = document.createElement('video');
    video.srcObject = stream;
    await video.play();

    const detector = new (window as any).BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code', 'codabar'],
    });

    // Try to detect for 5 seconds
    const result = await new Promise<string | null>((resolve) => {
      const timeout = setTimeout(() => {
        stream.getTracks().forEach((t) => t.stop());
        resolve(null);
      }, 5000);

      const interval = setInterval(async () => {
        try {
          const barcodes = await detector.detect(video);
          if (barcodes.length > 0) {
            clearTimeout(timeout);
            clearInterval(interval);
            stream.getTracks().forEach((t) => t.stop());
            resolve(barcodes[0].rawValue);
          }
        } catch {
          clearInterval(interval);
          clearTimeout(timeout);
          stream.getTracks().forEach((t) => t.stop());
          resolve(null);
        }
      }, 500);
    });

    return result;
  } catch {
    return null;
  }
}

export async function scanQRCodeCamera(): Promise<string | null> {
  try {
    if (!('BarcodeDetector' in window)) {
      // Fallback: use a hidden input to read from file
      return null;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: 640, height: 480 },
    });

    const video = document.createElement('video');
    video.srcObject = stream;
    await video.play();

    const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });

    const result = await new Promise<string | null>((resolve) => {
      const timeout = setTimeout(() => {
        stream.getTracks().forEach((t) => t.stop());
        resolve(null);
      }, 5000);

      const interval = setInterval(async () => {
        try {
          const barcodes = await detector.detect(video);
          if (barcodes.length > 0) {
            clearTimeout(timeout);
            clearInterval(interval);
            stream.getTracks().forEach((t) => t.stop());
            resolve(barcodes[0].rawValue);
          }
        } catch {
          clearInterval(interval);
          clearTimeout(timeout);
          stream.getTracks().forEach((t) => t.stop());
          resolve(null);
        }
      }, 500);
    });

    return result;
  } catch {
    return null;
  }
}
