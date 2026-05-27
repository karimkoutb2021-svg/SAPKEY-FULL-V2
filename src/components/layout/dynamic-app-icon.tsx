'use client';

/**
 * ═══════════════════════════════════════════════════════════
 *  Dynamic App Icon - Syncs with Branding Logo
 *  Updates manifest, apple-touch-icon, and favicon dynamically
 * ═══════════════════════════════════════════════════════════
 */

import { useEffect, useRef } from 'react';
import { useBrandingStore } from '@/lib/store/branding-store';

export function DynamicAppIcon() {
  const { branding } = useBrandingStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const primaryColor = branding.primaryColor || '#22C55E';
    const storeName = branding.storeName || 'SAPKEY';
    const logoUrl = branding.logo || '';

    // Generate icon using canvas
    const sizes = [16, 32, 48, 72, 96, 144, 152, 180, 192, 512];
    const generatedIcons: { size: number; url: string }[] = [];

    const generateIcon = (size: number): Promise<string> => {
      return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(''); return; }

        // Background - rounded square
        const radius = size * 0.22;
        ctx.beginPath();
        ctx.moveTo(radius, 0);
        ctx.lineTo(size - radius, 0);
        ctx.quadraticCurveTo(size, 0, size, radius);
        ctx.lineTo(size, size - radius);
        ctx.quadraticCurveTo(size, size, size - radius, size);
        ctx.lineTo(radius, size);
        ctx.quadraticCurveTo(0, size, 0, size - radius);
        ctx.lineTo(0, radius);
        ctx.quadraticCurveTo(0, 0, radius, 0);
        ctx.closePath();

        // Gradient background
        const gradient = ctx.createLinearGradient(0, 0, size, size);
        gradient.addColorStop(0, primaryColor);
        gradient.addColorStop(1, adjustColor(primaryColor, -30));
        ctx.fillStyle = gradient;
        ctx.fill();

        // If logo exists, try to draw it
        if (logoUrl) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const padding = size * 0.15;
            const imgSize = size - padding * 2;
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(padding + radius * 0.5, padding);
            ctx.lineTo(padding + imgSize - radius * 0.5, padding);
            ctx.quadraticCurveTo(padding + imgSize, padding, padding + imgSize, padding + radius * 0.5);
            ctx.lineTo(padding + imgSize, padding + imgSize - radius * 0.5);
            ctx.quadraticCurveTo(padding + imgSize, padding + imgSize, padding + imgSize - radius * 0.5, padding + imgSize);
            ctx.lineTo(padding + radius * 0.5, padding + imgSize);
            ctx.quadraticCurveTo(padding, padding + imgSize, padding, padding + imgSize - radius * 0.5);
            ctx.lineTo(padding, padding + radius * 0.5);
            ctx.quadraticCurveTo(padding, padding, padding + radius * 0.5, padding);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(img, padding, padding, imgSize, imgSize);
            ctx.restore();
            resolve(canvas.toDataURL('image/png'));
          };
          img.onerror = () => {
            // Fallback: draw initials
            drawInitials(ctx, size, storeName);
            resolve(canvas.toDataURL('image/png'));
          };
          img.src = logoUrl;
        } else {
          // Draw initials
          drawInitials(ctx, size, storeName);
          resolve(canvas.toDataURL('image/png'));
        }
      });
    };

    const drawInitials = (ctx: CanvasRenderingContext2D, size: number, name: string) => {
      const initials = name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `bold ${size * 0.4}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initials, size / 2, size / 2);
    };

    const adjustColor = (hex: string, amount: number): string => {
      const num = parseInt(hex.replace('#', ''), 16);
      const r = Math.min(255, Math.max(0, (num >> 16) + amount));
      const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
      const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    };

    // Generate all sizes
    Promise.all(sizes.map((s) => generateIcon(s))).then((urls) => {
      // Update link tags
      sizes.forEach((size, i) => {
        if (!urls[i]) return;

        let link = document.querySelector(`link[sizes="${size}x${size}"]`) as HTMLLinkElement;
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          link.sizes = `${size}x${size}`;
          link.type = 'image/png';
          document.head.appendChild(link);
        }
        link.href = urls[i];
      });

      // Update apple-touch-icon
      let appleLink = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
      if (!appleLink) {
        appleLink = document.createElement('link');
        appleLink.rel = 'apple-touch-icon';
        document.head.appendChild(appleLink);
      }
      appleLink.href = urls.find((u, i) => sizes[i] === 180) || urls[urls.length - 1];

      // Update manifest theme_color
      let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      if (manifestLink) {
        fetch(manifestLink.href)
          .then((r) => r.json())
          .then((manifest) => {
            manifest.theme_color = primaryColor;
            manifest.background_color = primaryColor;
            const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
            manifestLink.href = URL.createObjectURL(blob);
          })
          .catch(() => {});
      }
    });
  }, [branding.primaryColor, branding.storeName, branding.logo]);

  return null;
}
