import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

interface MediaItem {
  url: string
  category: string
  label: string
  source?: string
  altText?: string
  uploadedAt?: string
  usageCount: number
  thumbnailUrl?: string
  webpUrl?: string
  optimizedUrl?: string
}

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()

    const [products, accreditations, badges, certifications, banners, caseStudies, deployments, mediaAssets] = await Promise.all([
      db.collection('products').find({}).project({ name: 1, imageUrl: 1, imageUrls: 1, brochureUrl: 1, createdAt: 1 }).toArray(),
      db.collection('accreditations').find({}).project({ logo: 1, createdAt: 1 }).toArray(),
      db.collection('product_badges').find({}).project({ name: 1, iconUrl: 1, createdAt: 1 }).toArray(),
      db.collection('certifications').find({}).project({ name: 1, logoUrl: 1, createdAt: 1 }).toArray(),
      db.collection('banners').find({}).project({ imageUrl: 1, title: 1, createdAt: 1 }).toArray(),
      db.collection('case_studies').find({}).project({ title: 1, customer: 1, images: 1, createdAt: 1 }).toArray(),
      db.collection('deployments').find({}).project({ location: 1, department: 1, images: 1, createdAt: 1 }).toArray(),
      db.collection('media_assets').find({}).sort({ uploadedAt: -1 }).toArray(),
    ])

    const items: MediaItem[] = []

    // Directly-uploaded assets from media_assets collection (highest priority — include first)
    for (const a of mediaAssets) {
      if (a.url && typeof a.url === 'string' && a.url.startsWith('http')) {
        items.push({
          url: a.url,
          category: 'uploads',
          label: a.altText || a.source || 'Uploaded asset',
          source: 'uploads',
          altText: a.altText || '',
          uploadedAt: a.uploadedAt ? new Date(a.uploadedAt).toISOString() : undefined,
          usageCount: Array.isArray(a.usedIn) ? a.usedIn.length || 1 : 1,
          thumbnailUrl: a.thumbnailUrl,
          webpUrl: a.webpUrl,
          optimizedUrl: a.optimizedUrl,
        })
      }
    }

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
            source: 'products',
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
          source: 'products',
          uploadedAt: p.createdAt ? new Date(p.createdAt).toISOString() : undefined,
          usageCount: 1,
        })
      }
    }

    for (const a of accreditations) {
      if (a.logo && typeof a.logo === 'string' && a.logo.startsWith('http')) {
        items.push({ url: a.logo, category: 'certifications', label: 'Accreditation logo', source: 'accreditations', uploadedAt: a.createdAt ? new Date(a.createdAt).toISOString() : undefined, usageCount: 1 })
      }
    }

    for (const b of badges) {
      if (b.iconUrl && typeof b.iconUrl === 'string' && b.iconUrl.startsWith('http')) {
        items.push({ url: b.iconUrl, category: 'badges', label: String(b.name || 'Badge'), source: 'badges', uploadedAt: b.createdAt ? new Date(b.createdAt).toISOString() : undefined, usageCount: 1 })
      }
    }

    for (const c of certifications) {
      if (c.logoUrl && typeof c.logoUrl === 'string' && c.logoUrl.startsWith('http')) {
        items.push({ url: c.logoUrl, category: 'certifications', label: String(c.name || 'Cert logo'), source: 'certifications', uploadedAt: c.createdAt ? new Date(c.createdAt).toISOString() : undefined, usageCount: 1 })
      }
    }

    for (const b of banners) {
      if (b.imageUrl && typeof b.imageUrl === 'string' && b.imageUrl.startsWith('http')) {
        items.push({ url: b.imageUrl, category: 'homepage', label: String(b.title || 'Banner'), source: 'banners', uploadedAt: b.createdAt ? new Date(b.createdAt).toISOString() : undefined, usageCount: 1 })
      }
    }

    for (const cs of caseStudies) {
      for (const url of (Array.isArray(cs.images) ? cs.images : [])) {
        if (typeof url === 'string' && url.startsWith('http')) {
          items.push({ url, category: 'case-studies', label: String(cs.customer || cs.title || 'Case study'), source: 'case_studies', uploadedAt: cs.createdAt ? new Date(cs.createdAt).toISOString() : undefined, usageCount: 1 })
        }
      }
    }

    for (const d of deployments) {
      for (const url of (Array.isArray(d.images) ? d.images : [])) {
        if (typeof url === 'string' && url.startsWith('http')) {
          items.push({ url, category: 'deployments', label: String(d.department || d.location || 'Deployment'), source: 'deployments', uploadedAt: d.createdAt ? new Date(d.createdAt).toISOString() : undefined, usageCount: 1 })
        }
      }
    }

    // Deduplicate by URL, summing usage counts
    const deduped = new Map<string, MediaItem>()
    for (const item of items) {
      if (deduped.has(item.url)) {
        const existing = deduped.get(item.url)!
        existing.usageCount++
      } else {
        deduped.set(item.url, { ...item })
      }
    }

    const images = Array.from(deduped.values())

    // Return both array (backward compat) and named field
    return NextResponse.json(images, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('Error fetching media library:', error)
    return NextResponse.json([], { status: 500 })
  }
}
