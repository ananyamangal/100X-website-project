import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()
    const certs = await db.collection('certifications').find({}).sort({ sortOrder: 1 }).toArray()
    return NextResponse.json(certs)
  } catch (error) {
    console.error('Error fetching certifications:', error)
    return NextResponse.json({ error: 'Failed to fetch certifications' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise
    const db = client.db()
    const body = await request.json()

    const maxDoc = await db.collection('certifications').find({}).sort({ sortOrder: -1 }).limit(1).toArray()
    const sortOrder = maxDoc.length > 0 ? (maxDoc[0].sortOrder ?? 0) + 1 : 0

    const doc = {
      name:            body.name?.trim()            || 'Untitled Certification',
      logoUrl:         body.logoUrl                 || '',
      description:     body.description             || '',
      verificationUrl: body.verificationUrl         || '',
      isActive:        body.isActive                ?? true,
      sortOrder:       body.sortOrder               ?? sortOrder,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection('certifications').insertOne(doc)
    return NextResponse.json({ ...doc, _id: result.insertedId }, { status: 201 })
  } catch (error) {
    console.error('Error creating certification:', error)
    return NextResponse.json({ error: 'Failed to create certification' }, { status: 500 })
  }
}
