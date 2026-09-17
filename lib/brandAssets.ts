import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import clientPromise from '@/lib/mongodb'
import { LAYOUT_DATA_TAG, LAYOUT_DATA_REVALIDATE_SECONDS } from '@/lib/layoutData'

export interface BrandAssets {
  logoUrl: string
  logoAlt: string
  faviconUrl: string
  ogImageUrl: string
  footerLogoUrl: string
}

const DEFAULTS: BrandAssets = {
  logoUrl: '/logo-main.png',
  logoAlt: '100x Circle',
  faviconUrl: '/logo-main.png',
  ogImageUrl: '/logo-main.png',
  footerLogoUrl: '/logo-main.png',
}

// Throws on DB errors so a hiccup is never cached as DEFAULTS — see lib/layoutData.ts.
const fetchBrandAssets = unstable_cache(
  async (): Promise<BrandAssets> => {
    const client = await clientPromise
    const db = client.db()
    const doc = await db.collection('brand_assets').findOne({ key: 'main' })
    if (!doc) return DEFAULTS
    return {
      logoUrl: doc.logoUrl || DEFAULTS.logoUrl,
      logoAlt: doc.logoAlt || DEFAULTS.logoAlt,
      faviconUrl: doc.faviconUrl || DEFAULTS.faviconUrl,
      ogImageUrl: doc.ogImageUrl || DEFAULTS.ogImageUrl,
      footerLogoUrl: doc.footerLogoUrl || DEFAULTS.footerLogoUrl,
    }
  },
  ['brand-assets-v1'],
  { tags: [LAYOUT_DATA_TAG], revalidate: LAYOUT_DATA_REVALIDATE_SECONDS },
)

export const getBrandAssets = cache(async (): Promise<BrandAssets> => {
  try {
    return await fetchBrandAssets()
  } catch {
    return DEFAULTS
  }
})
