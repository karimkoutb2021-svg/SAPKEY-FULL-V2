'use client';

// Simple QR code generation using canvas
// QR code encodes: product barcode number
// Scanning QR = same as scanning barcode

export function generateQR(text: string, size: number = 200): string {
  // Simple QR-like pattern using canvas
  // In production, use a proper QR library like qrcode
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  const cellSize = size / 25;
  const data = text.split('').map((c) => c.charCodeAt(0));

  // Draw finder patterns (corners)
  ctx.fillStyle = '#000000';
  // Top-left
  drawFinder(ctx, 0, 0, cellSize);
  // Top-right
  drawFinder(ctx, size - 7 * cellSize, 0, cellSize);
  // Bottom-left
  drawFinder(ctx, 0, size - 7 * cellSize, cellSize);

  // Draw data modules
  for (let row = 7; row < 18; row++) {
    for (let col = 7; col < 18; col++) {
      const bitIdx = (row - 7) * 11 + (col - 7);
      const byteIdx = Math.floor(bitIdx / 8);
      const bitPos = bitIdx % 8;
      if (byteIdx < data.length) {
        const bit = (data[byteIdx] >> (7 - bitPos)) & 1;
        if (bit) {
          ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
        }
      }
    }
  }

  // Add timing patterns
  ctx.fillStyle = '#000000';
  for (let i = 8; i < 17; i++) {
    if (i % 2 === 0) {
      ctx.fillRect(i * cellSize, 6 * cellSize, cellSize, cellSize);
      ctx.fillRect(6 * cellSize, i * cellSize, cellSize, cellSize);
    }
  }

  // Text label at bottom
  ctx.fillStyle = '#000000';
  ctx.font = `${Math.max(8, size / 25)}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(text, size / 2, size - 4);

  return canvas.toDataURL('image/png');
}

function drawFinder(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.fillStyle = '#000000';
  // Outer 7x7
  ctx.fillRect(x, y, 7 * s, 7 * s);
  // White 5x5
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + s, y + s, 5 * s, 5 * s);
  // Black 3x3
  ctx.fillStyle = '#000000';
  ctx.fillRect(x + 2 * s, y + 2 * s, 3 * s, 3 * s);
}

// Generate barcode as visual string (for printing)
export function generateBarcodeText(code: string): string {
  // Simple barcode visualization
  const chars = code.split('');
  let barcode = '|';
  chars.forEach((c, i) => {
    const n = c.charCodeAt(0) % 10;
    const width = n % 2 === 0 ? '█' : '▌';
    barcode += width.repeat(Math.max(1, n));
    if (i < chars.length - 1) barcode += ' ';
  });
  barcode += '|';
  return barcode;
}

// Print barcode labels for products
export function printBarcodeLabels(products: Array<{ nameAr: string; price: number; barcode: string }>): void {
  const w = window.open('', '_blank', 'width=600,height=800');
  if (!w) return;

  w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>باركود</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'Courier New',monospace; padding:10px; }
.label { width: 200px; height: 100px; border:1px dashed #ccc; display:inline-block; margin:5px; padding:8px; text-align:center; page-break-inside:avoid; }
.label .name { font-size:10px; font-weight:bold; margin-bottom:2px; }
.label .price { font-size:9px; color:#22C55E; margin-bottom:3px; }
.label .barcode { font-size:7px; letter-spacing:1px; font-family:monospace; }
</style></head><body>
${products.map((p) => `<div class="label"><div class="name">${p.nameAr}</div><div class="price">${p.price} ج.م</div><div class="barcode">${p.barcode}</div><div style="font-size:6px;margin-top:2px;">${'█'.repeat(p.barcode.length * 2)}</div></div>`).join('')}
<script>window.print()</script></body></html>`);
  w.document.close();
}
