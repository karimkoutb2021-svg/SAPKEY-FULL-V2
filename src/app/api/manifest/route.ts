import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  let logo = '/icons/icon-192.png';
  let appIcon = '/icons/icon-512.png';
  let storeName = 'SAPKEY SMART GRO';
  let storeNameShort = 'SAPKEY SMART GRO';
  let slogan = 'نظام متكامل لإدارة السوبر ماركت - مبيعات، مخزون، محاسبة، توصيل';
  let primaryColor = '#0A0A0C';

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('branding_settings')
      .select().limit(500)
      .in('key', ['logo', 'appIcon', 'favicon', 'storeName', 'storeNameEn', 'slogan', 'primaryColor']);

    if (data) {
      for (const row of data) {
        try {
          const val = JSON.parse(row.value);
          switch (row.key) {
            case 'logo': logo = val || logo; break;
            case 'appIcon': appIcon = val || appIcon; break;
            case 'storeName': storeName = val || storeName; break;
            case 'storeNameEn': storeNameShort = val || storeNameShort; break;
            case 'slogan': slogan = val || slogan; break;
            case 'primaryColor': primaryColor = val || primaryColor; break;
          }
        } catch {
          switch (row.key) {
            case 'logo': logo = row.value || logo; break;
            case 'appIcon': appIcon = row.value || appIcon; break;
            case 'storeName': storeName = row.value || storeName; break;
            case 'storeNameEn': storeNameShort = row.value || storeNameShort; break;
            case 'slogan': slogan = row.value || slogan; break;
            case 'primaryColor': primaryColor = row.value || primaryColor; break;
          }
        }
      }
    }
  } catch {
    // Fallback to default values
  }

  const manifest = {
    name: storeName,
    short_name: storeNameShort,
    description: slogan,
    start_url: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone'],
    background_color: '#FFFFFF',
    theme_color: primaryColor,
    orientation: 'any',
    dir: 'rtl',
    lang: 'ar',
    scope: '/',
    id: '/dashboard',
    icons: [
      { src: appIcon || logo || '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      { src: logo || '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
    ],
    screenshots: [
      {
        src: '/screenshots/dashboard.png',
        sizes: '1280x720',
        type: 'image/png',
        form_factor: 'wide',
        label: 'لوحة التحكم الرئيسية',
      },
    ],
    categories: ['business', 'productivity', 'shopping'],
    prefer_related_applications: false,
    related_applications: [],
    shortcuts: [
      {
        name: 'نقطة البيع',
        short_name: 'الكاشير',
        description: 'فتح نظام نقاط البيع',
        url: '/pos',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'المخزون',
        short_name: 'المخزون',
        description: 'إدارة المخزون',
        url: '/inventory',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'الطلبات',
        short_name: 'الطلبات',
        description: 'عرض الطلبات',
        url: '/orders',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
    handle_links: 'preferred',
    launch_handler: { client_mode: 'auto' },
    edge_side_panel: { preferred_width: 480 },
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
