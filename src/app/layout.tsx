import type { Metadata, Viewport } from 'next';
import fs from 'fs';
import path from 'path';
import './globals.css';
import { Providers } from './providers';
import { PremiumLoader } from '@/components/layout/premium-loader';
import { DynamicFavicon } from '@/components/layout/dynamic-favicon';

function getBuildId(): string {
  try {
    const versionPath = path.join(process.cwd(), 'public', 'version.json');
    if (fs.existsSync(versionPath)) {
      const data = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
      return data.buildId || 'unknown';
    }
  } catch {}
  return 'unknown';
}

export const metadata: Metadata = {
  title: 'SAPKEY GROCERY - نظام إدارة السوبر ماركت',
  description: 'Enterprise Supermarket ERP + POS + Ecommerce Platform',
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/logo.jpg' },
    ],
    apple: [
      { url: '/logo.jpg', sizes: '192x192' },
    ],
  },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'SAPKEY GROCERY' },
};

export const viewport: Viewport = {
  themeColor: '#0A0A0C',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const buildId = getBuildId();
  
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning data-scroll-behavior="smooth" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&family=Tajawal:wght@300;400;500;700&display=swap" rel="stylesheet" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#0A0A0C" />
        <meta name="build-id" content={buildId} />
        <meta name="color-scheme" content="dark" />
        <script dangerouslySetInnerHTML={{ __html: 'document.documentElement.classList.add("dark");' }} />
        <DynamicFavicon />
      </head>
      <body suppressHydrationWarning className="min-h-screen antialiased bg-[#0A0A0C] text-white selection:bg-emerald-500/30 selection:text-emerald-200" style={{ fontFamily: '"Cairo", -apple-system, BlinkMacSystemFont, "SF Pro Arabic", "Segoe UI", Roboto, sans-serif' }}>
        <PremiumLoader />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
