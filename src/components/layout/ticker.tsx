'use client';

import { useBrandingStore } from '@/lib/store/branding-store';
import { Sparkles } from 'lucide-react';

export function Ticker() {
  const { branding } = useBrandingStore();

  const isActive = branding.topBannerActive ?? branding.tickerActive;
  const rawText = branding.topBannerText || branding.tickerText;

  if (!isActive || !rawText) return null;

  // Split by ' | ' to get multiple offers, trim whitespace
  const offers = rawText
    .split(' | ')
    .map((s) => s.trim())
    .filter(Boolean);

  // Calculate animation duration based on total content length (slower scrolling)
  const totalLength = offers.join('').length;
  const duration = Math.max(30, totalLength * 0.5);

  return (
    <div
      className="w-full overflow-hidden relative h-10 shadow-sm"
      style={{ backgroundColor: branding.tickerColor || '#EF4444' }}
      dir="ltr"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-black/10 z-10 pointer-events-none" />

      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .ticker-track {
          display: flex;
          align-items: center;
          white-space: nowrap;
          animation: marquee ${duration}s linear infinite;
          height: 100%;
        }
        .ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="ticker-track">
        {/* Render offers twice for seamless loop */}
        {[0, 1].map((setIndex) => (
          <div key={setIndex} className="flex items-center shrink-0">
            {offers.map((offer, i) => (
              <span
                key={`${setIndex}-${i}`}
                className="flex items-center gap-3 px-6 text-white text-sm font-bold tracking-wide"
              >
                <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse shrink-0" />
                <span>{offer}</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
