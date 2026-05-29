import { cache } from 'react'
import clientPromise from '@/lib/mongodb'

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

export const getBrandAssets = cache(async (): Promise<BrandAssets> => {
  try {
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
  } catch {
    return DEFAULTS
  }
})
