import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

const KEY = 'main'

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()
    const doc = await db.collection('brand_assets').findOne({ key: KEY })
    return NextResponse.json({
      logoUrl: doc?.logoUrl ?? '/logo-main.png',
      logoAlt: doc?.logoAlt ?? '100x Circle',
      faviconUrl: doc?.faviconUrl ?? '/logo-main.png',
      ogImageUrl: doc?.ogImageUrl ?? '/logo-main.png',
      footerLogoUrl: doc?.footerLogoUrl ?? '/logo-main.png',
    })
  } catch {
    return NextResponse.json({
      logoUrl: '/logo-main.png',
      logoAlt: '100x Circle',
      faviconUrl: '/logo-main.png',
      ogImageUrl: '/logo-main.png',
      footerLogoUrl: '/logo-main.png',
    })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const client = await clientPromise
    const db = client.db()
    const update = {
      logoUrl: body.logoUrl || '/logo-main.png',
      logoAlt: body.logoAlt || '100x Circle',
      faviconUrl: body.faviconUrl || '/logo-main.png',
      ogImageUrl: body.ogImageUrl || '/logo-main.png',
      footerLogoUrl: body.footerLogoUrl || '/logo-main.png',
      updatedAt: new Date(),
    }
    await db.collection('brand_assets').updateOne(
      { key: KEY },
      { $set: update },
      { upsert: true }
    )
    return NextResponse.json(update)
  } catch (error) {
    console.error('Error saving brand assets:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
