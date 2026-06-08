import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()
    const badges = await db.collection('product_badges').find({}).sort({ order: 1 }).toArray()
    return NextResponse.json(badges)
  } catch (error) {
    console.error('Error fetching product badges:', error)
    return NextResponse.json({ error: 'Failed to fetch product badges' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise
    const db = client.db()
    const body = await request.json()

    const maxDoc = await db.collection('product_badges').find({}).sort({ order: -1 }).limit(1).toArray()
    const order = maxDoc.length > 0 ? (maxDoc[0].order ?? 0) + 1 : 0

    const doc = {
      name:        body.name?.trim() || 'Untitled Badge',
      iconUrl:     body.iconUrl     || '',
      color:       body.color       || '#6b7280',
      colorClass:  body.colorClass  || 'bg-gray-100 text-gray-800',
      priority:    body.priority    ?? 0,
      isActive:    body.isActive    ?? true,
      tooltipText: body.tooltipText || '',
      order,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection('product_badges').insertOne(doc)
    return NextResponse.json({ ...doc, _id: result.insertedId }, { status: 201 })
  } catch (error) {
    console.error('Error creating product badge:', error)
    return NextResponse.json({ error: 'Failed to create product badge' }, { status: 500 })
  }
}
