// Revalidate layout data every 5 minutes — brand assets and trust badges
// change rarely; no need to hit MongoDB on every request.
export const revalidate = 300

import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import { Suspense } from 'react'
import { headers } from 'next/headers'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import './globals.css'
import Navbar from '../components/Navbar'
import SiteFooter from '@/components/SiteFooter'
import GlobalJsonLd from '@/components/seo/GlobalJsonLd'
import SeoSchemaOverrideInjector from '@/components/seo/SeoSchemaOverrideInjector'
import UtmPersist from '@/components/UtmPersist'
import { Toaster } from '@/components/ui/sonner'
import { MobileCtaProvider } from '@/components/cta/MobileCtaContext'
import MobileCtaBar from '@/components/cta/MobileCtaBar'
import { SITE_URL, SITE_NAME } from '@/lib/seo/site-config'
import { getBrandAssets } from '@/lib/brandAssets'
import WhatsAppFloatingButton from '@/components/WhatsAppFloatingButton'
import ClientOnlyPopups from '@/components/ClientOnlyPopups'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  preload: true,
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#b91c1c',
}

export async function generateMetadata(): Promise<Metadata> {
  const assets = await getBrandAssets()
  const ogImage = assets.ogImageUrl.startsWith('/')
    ? `${SITE_URL}${assets.ogImageUrl}`
    : assets.ogImageUrl
  const faviconUrl = assets.faviconUrl.startsWith('/')
    ? `${SITE_URL}${assets.faviconUrl}`
    : assets.faviconUrl

  return {
    metadataBase: new URL(SITE_URL),
    title: 'Thermal Fogging Machine Manufacturer in India | 100x Circle',
    description:
      'Factory-direct thermal foggers — vehicle-mounted, portable, SS-tank. GeM-approved OEM. Municipalities, pest control firms & farms across India. Get a quote.',
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
    icons: {
      icon: [{ url: faviconUrl, sizes: '48x48' }],
    },
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
          url: ogImage,
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
      images: [ogImage],
    },
    category: 'business',
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Skip public UI entirely for admin routes — the middleware injects
  // x-is-admin: 1 for all /admin/* requests so we can detect it here.
  const headersList = await headers()
  const isAdmin = headersList.get("x-is-admin") === "1"

  if (isAdmin) {
    return (
      <html lang="en" className={inter.variable}>
        <body className="min-h-screen antialiased">{children}</body>
      </html>
    )
  }

  // i18n: resolves to the request's locale for pages under app/[locale]/
  // (Phase 1: en/hi/id), and to the 'en' default everywhere else — untouched
  // pages never run the intl middleware so this always falls back safely.
  const [locale, messages] = await Promise.all([getLocale(), getMessages()])
  const dir = locale === "ur" || locale === "ar" ? "rtl" : "ltr"

  // getLocale() falls back to "en" for EVERY untouched page too (there's no
  // way to tell "genuinely locale-managed and resolved to en" from "not
  // locale-managed at all" from the locale value alone) — x-locale-managed
  // is set by middleware only for the 9 actual locale-managed pages, so only
  // those get <html lang={locale}>. Every other page keeps lang="en-IN"
  // exactly as it was before Phase 1.
  const isLocaleManaged = headersList.get("x-locale-managed") === "1"
  const htmlLang = isLocaleManaged ? locale : "en-IN"

  // Run both DB calls in parallel to minimize layout TTFB
  const [brandAssets, hasBrochure, trustBadges] = await Promise.all([
    getBrandAssets(),
    (async () => {
      try {
        const { default: clientPromise } = await import('@/lib/mongodb')
        const client = await clientPromise
        const count = await client
          .db()
          .collection('brochures.files')
          .countDocuments({ filename: 'main-brochure.pdf' })
        return count > 0
      } catch {
        return false
      }
    })(),
    (async () => {
      try {
        const { default: clientPromise } = await import('@/lib/mongodb')
        const client = await clientPromise
        const raw = await client
          .db()
          .collection('trust_badges')
          .find({ isActive: true })
          .sort({ order: 1 })
          .toArray()
        return JSON.parse(JSON.stringify(raw))
      } catch {
        return []
      }
    })(),
  ])

  return (
    <html lang={htmlLang} dir={isLocaleManaged ? dir : undefined} className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <Script id="gtm-head" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-5JMGCKRW');`}
        </Script>
        {/* GA4 direct tag — send_page_view:true. Verified 2026-08-01: GTM-5JMGCKRW's
            live container was NOT sending page_view to G-GEWH5YB3PS (confirmed via
            live network capture — only a Google Ads remarketing tag was firing, to an
            unrelated ID). This tag now owns page_view directly instead of relying on GTM.
            TODO: if GTM ever gets its own GA4 Configuration tag pointed at G-GEWH5YB3PS,
            revert send_page_view to false here to avoid double-counting page_view events. */}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-GEWH5YB3PS" strategy="afterInteractive" />
        <Script id="ga4-config" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-GEWH5YB3PS',{send_page_view:true,transport_url:'https://www.google-analytics.com'});`}
        </Script>
        {/* Hero banner LCP preload — media-scoped so each viewport only
            preloads the variant it will actually paint. */}
        <link rel="preload" as="image" href="/banner-mobile.jpg" media="(max-width: 767.98px)" />
        <link rel="preload" as="image" href="/banner-tablet.jpg" media="(min-width: 768px) and (max-width: 1023.98px)" />
        <link rel="preload" as="image" href="/banner-desktop.jpg" media="(min-width: 1024px)" />
      </head>
      <body className="min-h-screen antialiased">
      <NextIntlClientProvider locale={locale} messages={messages}>
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
        <SeoSchemaOverrideInjector />
        <Suspense fallback={null}>
          <UtmPersist />
        </Suspense>
        <a
          href="#main-content"
          className="fixed left-4 top-4 z-[100] -translate-y-[200%] rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-lg ring-2 ring-brand-600 transition-transform focus:translate-y-0"
        >
          Skip to main content
        </a>
        <ClientOnlyPopups />
        <Script id="data-layer-events" strategy="afterInteractive">
          {`(function(){window.dataLayer=window.dataLayer||[];function gtmCtx(){var a={};try{a=JSON.parse(sessionStorage.getItem('attribution_v1')||'{}')||{};}catch(e){}return Object.assign({page_path:location.pathname,page_url:location.href,timestamp_iso:new Date().toISOString()},a);}document.addEventListener('click',function(e){var el=e.target&&e.target.closest&&e.target.closest('a[href], button[type="submit"]');if(!el)return;var lw=e.target&&e.target.closest&&e.target.closest('[data-gtm-location]');var ll=(lw&&lw.getAttribute('data-gtm-location'))||'';var href=(el.getAttribute&&el.getAttribute('href'))||'';var h=String(href).toLowerCase();if(h.indexOf('tel:')===0){var tp=Object.assign(gtmCtx(),{event:'phone_click',ga4_event:'call_click',link_url:href,phone_number:href.replace('tel:',''),value:500,currency:'INR'});if(ll)tp.link_location=ll;window.dataLayer.push(tp);return;}if(h.indexOf('mailto:')===0){var mp=Object.assign(gtmCtx(),{event:'email_click',link_url:href});if(ll)mp.link_location=ll;window.dataLayer.push(mp);return;}if(h.indexOf('wa.me')!==-1||h.indexOf('whatsapp')!==-1){var wp=Object.assign(gtmCtx(),{event:'whatsapp_click',ga4_event:'contact',whatsapp_url:href,value:500,currency:'INR'});if(ll)wp.link_location=ll;window.dataLayer.push(wp);return;}if(h.indexOf('.pdf')!==-1||(el.getAttribute&&el.getAttribute('data-download'))){window.dataLayer.push(Object.assign(gtmCtx(),{event:'file_download',ga4_event:'file_download',file_name:href.split('/').pop()||'brochure',file_extension:'pdf',link_url:href}));return;}if(h.indexOf('gem.gov.in')!==-1){window.dataLayer.push(Object.assign(gtmCtx(),{event:'gem_click',link_url:href}));}},true);document.addEventListener('submit',function(e){var f=e.target;if(!f||f.tagName!=='FORM')return;var fi=f.id||'';var ic=fi.indexOf('contact')!==-1||(f.getAttribute&&f.getAttribute('data-form-type')==='contact');var ir=fi.indexOf('rfq')!==-1||(f.getAttribute&&f.getAttribute('data-form-type')==='rfq');window.dataLayer.push(Object.assign(gtmCtx(),{event:ic?'contact_form_submit':ir?'rfq_form_submit_attempt':'form_submit_attempt',form_id:fi,form_action:f.action||''}));},true);(function(){var ts=[25,50,75,100],fired={};function os(){var s=(window.scrollY+window.innerHeight)/document.documentElement.scrollHeight*100;ts.forEach(function(t){if(!fired[t]&&s>=t){fired[t]=true;window.dataLayer.push(Object.assign(gtmCtx(),{event:'scroll_depth',scroll_threshold:t,percent_scrolled:t}));}});}window.addEventListener('scroll',os,{passive:true});})();(function(){[30000,60000].forEach(function(ms){setTimeout(function(){window.dataLayer.push(Object.assign(gtmCtx(),{event:'user_engagement',engagement_time_msec:ms,engaged_seconds:ms/1000}));},ms);});})();window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};window.gtag_report_conversion=window.gtag_report_conversion||function(url){window.dataLayer=window.dataLayer||[];window.dataLayer.push({event:'legacy_conversion_call',conversion_url:url||''});if(url)window.location=url;return false;};})();`}
        </Script>
        <MobileCtaProvider>
          <Navbar logoUrl={brandAssets.logoUrl} logoAlt={brandAssets.logoAlt} hasBrochure={hasBrochure} />
          <main id="main-content" tabIndex={-1}>
            {children}
          </main>
          <SiteFooter
            logoUrl={brandAssets.footerLogoUrl}
            logoAlt={brandAssets.logoAlt}
            trustBadges={trustBadges}
            locale={isLocaleManaged ? locale : "en"}
          />
          <MobileCtaBar />
        </MobileCtaProvider>
        <WhatsAppFloatingButton
          waNumber="917827229116"
          displayPhone="+91 78272 29116"
          phoneDigitsForEvents="7827229116"
        />
        <Toaster richColors position="top-right" closeButton />
      </NextIntlClientProvider>
      </body>
    </html>
  )
}
