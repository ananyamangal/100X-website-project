import type { Metadata, Viewport } from 'next'
import { SITE_URL, SITE_NAME } from '@/lib/seo/site-config'
import { getBrandAssets } from '@/lib/brandAssets'

// Site-wide <head> metadata, shared verbatim by every root layout
// (app/(site), app/[locale], app/(admin)) so the public <head> is unchanged
// by the route-group split. Page-level generateMetadata still merges over it.
export const rootViewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#b91c1c',
}

export async function generateRootMetadata(): Promise<Metadata> {
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
      // B5 (2026-10): no "Best ..." superlative in the inherited social title;
      // matches the default <title>. Description wording (incl. agriculture) kept.
      title: 'Thermal Fogging Machine Manufacturer in India | 100x Circle',
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
      title: 'Thermal Fogging Machine Manufacturer in India | 100x Circle',
      description:
        'Industrial fogging machines and agricultural equipment from 100x Circle — demos, specs, and nationwide support.',
      images: [ogImage],
    },
    category: 'business',
  }
}
