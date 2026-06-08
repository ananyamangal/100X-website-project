import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

interface MediaItem {
  url: string
  category: string
  label: string
  uploadedAt?: string
  usageCount: number
}

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()

    const [products, accreditations, badges, certifications, banners] = await Promise.all([
      db.collection('products').find({}).project({
        name: 1, imageUrl: 1, imageUrls: 1, brochureUrl: 1, heroVideoUrl: 1, createdAt: 1,
      }).toArray(),
      db.collection('accreditations').find({}).project({ logo: 1, createdAt: 1 }).toArray(),
      db.collection('product_badges').find({}).project({ name: 1, iconUrl: 1, createdAt: 1 }).toArray(),
      db.collection('certifications').find({}).project({ name: 1, logoUrl: 1, createdAt: 1 }).toArray(),
      db.collection('banners').find({}).project({ imageUrl: 1, title: 1, createdAt: 1 }).toArray(),
    ])

    const items: MediaItem[] = []

    for (const p of products) {
      const urls: string[] = [
        ...(Array.isArray(p.imageUrls) ? p.imageUrls : []),
        p.imageUrl,
      ].filter(Boolean)
      for (const url of urls) {
        if (typeof url === 'string' && url.startsWith('http')) {
          items.push({
            url,
            category: 'products',
            label: String(p.name || 'Product image'),
            uploadedAt: p.createdAt ? new Date(p.createdAt).toISOString() : undefined,
            usageCount: 1,
          })
        }
      }
      if (p.brochureUrl) {
        items.push({
          url: String(p.brochureUrl),
          category: 'documents',
          label: `${p.name || 'Product'} brochure`,
          uploadedAt: p.createdAt ? new Date(p.createdAt).toISOString() : undefined,
          usageCount: 1,
        })
      }
    }

    for (const a of accreditations) {
      if (a.logo && typeof a.logo === 'string' && a.logo.startsWith('http')) {
        items.push({
          url: a.logo,
          category: 'certifications',
          label: 'Accreditation logo',
          uploadedAt: a.createdAt ? new Date(a.createdAt).toISOString() : undefined,
          usageCount: 1,
        })
      }
    }

    for (const b of badges) {
      if (b.iconUrl && typeof b.iconUrl === 'string' && b.iconUrl.startsWith('http')) {
        items.push({
          url: b.iconUrl,
          category: 'badges',
          label: String(b.name || 'Badge icon'),
          uploadedAt: b.createdAt ? new Date(b.createdAt).toISOString() : undefined,
          usageCount: 1,
        })
      }
    }

    for (const c of certifications) {
      if (c.logoUrl && typeof c.logoUrl === 'string' && c.logoUrl.startsWith('http')) {
        items.push({
          url: c.logoUrl,
          category: 'certifications',
          label: String(c.name || 'Certification logo'),
          uploadedAt: c.createdAt ? new Date(c.createdAt).toISOString() : undefined,
          usageCount: 1,
        })
      }
    }

    for (const b of banners) {
      if (b.imageUrl && typeof b.imageUrl === 'string' && b.imageUrl.startsWith('http')) {
        items.push({
          url: b.imageUrl,
          category: 'homepage',
          label: String(b.title || 'Banner image'),
          uploadedAt: b.createdAt ? new Date(b.createdAt).toISOString() : undefined,
          usageCount: 1,
        })
      }
    }

    // Deduplicate by URL, summing usage counts
    const deduped = new Map<string, MediaItem>()
    for (const item of items) {
      if (deduped.has(item.url)) {
        deduped.get(item.url)!.usageCount++
      } else {
        deduped.set(item.url, { ...item })
      }
    }

    return NextResponse.json(Array.from(deduped.values()).reverse())
  } catch (error) {
    console.error('Error fetching media library:', error)
    return NextResponse.json({ error: 'Failed to fetch media library' }, { status: 500 })
  }
}
