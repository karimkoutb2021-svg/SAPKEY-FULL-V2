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
  manifest: '/api/manifest',
  icons: {
    icon: [
      { url: '/logo.jpg' },
    ],
    apple: [
      { url: '/logo.jpg', sizes: '192x192' },
    ],
  },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'SAPKEY GROCERY' },
};

export const viewport: Viewport = {
  themeColor: '#FFFFFF',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const buildId = getBuildId();
  
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&family=Tajawal:wght@300;400;500;700&display=swap" rel="stylesheet" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#FFFFFF" />
        <meta name="build-id" content={buildId} />
        <meta name="color-scheme" content="light" />
        <script dangerouslySetInnerHTML={{ __html: 'document.documentElement.classList.remove("dark");' }} />
        <DynamicFavicon />
      </head>
      <body className="min-h-screen antialiased" style={{ fontFamily: '"Cairo", -apple-system, BlinkMacSystemFont, "SF Pro Arabic", "Segoe UI", Roboto, sans-serif' }}>
        <PremiumLoader />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
