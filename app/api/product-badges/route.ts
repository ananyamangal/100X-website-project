// Public endpoint — no auth required. Used by product pages to render badge logos/colors.
import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()
    const badges = await db.collection('product_badges')
      .find({ isActive: true })
      .sort({ order: 1 })
      .project({ name: 1, iconUrl: 1, color: 1, colorClass: 1, tooltipText: 1, priority: 1 })
      .toArray()
    return NextResponse.json(badges, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    })
  } catch (error) {
    console.error('Error fetching product badges:', error)
    return NextResponse.json([], { status: 200 })
  }
}
