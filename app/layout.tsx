import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import { Suspense } from 'react'
import './globals.css'
import Navbar from '../components/Navbar'

// Premium body + display typeface. Single weight family file kept small;
// variable axis covers 100–900 so the redesigned headlines can use 700/800
// without an extra HTTP request. Exposed as `var(--font-sans)` so existing
// Arial fallback in globals.css inherits it automatically.
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})
import GemPopup from '@/components/GemPopup'
import VideoPopup from '@/components/VideoPopup'
import SiteFooter from '@/components/SiteFooter'
import GlobalJsonLd from '@/components/seo/GlobalJsonLd'
import UtmPersist from '@/components/UtmPersist'
import { Toaster } from '@/components/ui/sonner'
import { MobileCtaProvider } from '@/components/cta/MobileCtaContext'
import MobileCtaBar from '@/components/cta/MobileCtaBar'
import { SITE_URL, SITE_NAME, defaultOgImage } from '@/lib/seo/site-config'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#16a34a',
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title:
    'Best Thermal Fogging Machine Manufacturer | 100x Circle',
  description:
    'Discover 100x Circle — thermal fogging machine manufacturer serving Delhi, Uttar Pradesh, Bihar, Mumbai, Pune, and across India. Industrial mosquito foggers, vehicle-mounted systems, and agricultural equipment.',
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: [
      '7yMHOjyWo4oTSZpe1JQP0P7CR1t0dxuHSVufT6u065A',
      'saCxhHF_sk36QWa6G2RxUYaSRHPjAujIOzdLf8X72II',
    ],
  },
  alternates: {
    canonical: '/',
  },
  keywords: [
    'thermal fogging machine manufacturer',
    'mosquito fogging machine India',
    'vehicle mounted fogger',
    'industrial fogging machine',
    'pest control equipment supplier',
    '100x Circle',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: 'Best Thermal Fogging Machine Manufacturer | 100x Circle',
    description:
      'High-performance thermal and pulse-jet fogging machines for public health, municipalities, and agriculture — manufactured and supplied across India.',
    images: [
      {
        url: defaultOgImage,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} — thermal fogging equipment`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Best Thermal Fogging Machine Manufacturer | 100x Circle',
    description:
      'Industrial fogging machines and agricultural equipment from 100x Circle — demos, specs, and nationwide support.',
    images: [defaultOgImage],
  },
  category: 'business',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en-IN" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <Script id="gtm-head" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-5JMGCKRW');
          `}
        </Script>
        <link rel="icon" href="/logo-main.png" sizes="48x48" />
      </head>
      <body className="min-h-screen antialiased">
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-5JMGCKRW"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
            title="Google Tag Manager"
          />
        </noscript>
        <GlobalJsonLd />
        <Suspense fallback={null}>
          <UtmPersist />
        </Suspense>
        <a
          href="#main-content"
          className="fixed left-4 top-4 z-[100] -translate-y-[200%] rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-lg ring-2 ring-green-600 transition-transform focus:translate-y-0"
        >
          Skip to main content
        </a>
        <GemPopup />
        <VideoPopup />
        <Script id="data-layer-events" strategy="afterInteractive">
          {`
            (function () {
              window.dataLayer = window.dataLayer || [];

              function gtmContextFromStorage() {
                var attrs = {};
                try {
                  attrs = JSON.parse(sessionStorage.getItem('attribution_v1') || '{}') || {};
                } catch (e) {}
                return Object.assign(
                  {
                    page_path: location.pathname,
                    page_url: location.href,
                    timestamp_iso: new Date().toISOString(),
                  },
                  attrs
                );
              }

              document.addEventListener(
                'click',
                function (event) {
                  var el = event.target && event.target.closest && event.target.closest('a[href], button[type="submit"]');
                  if (!el) return;
                  var locWrap = event.target && event.target.closest && event.target.closest('[data-gtm-location]');
                  var link_location = (locWrap && locWrap.getAttribute('data-gtm-location')) || '';
                  var href = (el.getAttribute && el.getAttribute('href')) || '';
                  var h = String(href).toLowerCase();
                  if (h.indexOf('tel:') === 0) {
                    var telPayload = Object.assign(gtmContextFromStorage(), { event: 'phone_click', link_url: href });
                    if (link_location) telPayload.link_location = link_location;
                    window.dataLayer.push(telPayload);
                    return;
                  }
                  if (h.indexOf('mailto:') === 0) {
                    var mailPayload = Object.assign(gtmContextFromStorage(), { event: 'email_click', link_url: href });
                    if (link_location) mailPayload.link_location = link_location;
                    window.dataLayer.push(mailPayload);
                    return;
                  }
                  if (h.indexOf('wa.me') !== -1 || h.indexOf('whatsapp') !== -1) {
                    var waPayload = Object.assign(gtmContextFromStorage(), { event: 'whatsapp_click', whatsapp_url: href });
                    if (link_location) waPayload.link_location = link_location;
                    window.dataLayer.push(waPayload);
                    return;
                  }
                },
                true
              );

              document.addEventListener(
                'submit',
                function (e) {
                  var form = e.target;
                  if (!form || form.tagName !== 'FORM') return;
                  window.dataLayer.push(
                    Object.assign(gtmContextFromStorage(), {
                      event: 'form_submit_attempt',
                      form_id: form.id || '',
                      form_action: form.action || '',
                    })
                  );
                },
                true
              );
            })();

            window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
            window.gtag_report_conversion = window.gtag_report_conversion || function(url) {
              window.dataLayer = window.dataLayer || [];
              window.dataLayer.push({
                event: 'legacy_conversion_call',
                conversion_url: url || ''
              });
              if (url) window.location = url;
              return false;
            };
          `}
        </Script>
        <MobileCtaProvider>
          <Navbar />
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
          <SiteFooter />
          <MobileCtaBar />
        </MobileCtaProvider>
        <Toaster richColors position="top-right" closeButton />
      </body>
    </html>
  )
}
