import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

    const client = await clientPromise
    const db = client.db()
    const body = await request.json()
    const { _id, createdAt, ...update } = body

    const exists = await db.collection('certifications').findOne({ _id: new ObjectId(id) })
    if (!exists) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await db.collection('certifications').updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...update, updatedAt: new Date() } },
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating certification:', error)
    return NextResponse.json({ error: 'Failed to update certification' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

    const client = await clientPromise
    const db = client.db()

    const result = await db.collection('certifications').deleteOne({ _id: new ObjectId(id) })
    if (result.deletedCount === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting certification:', error)
    return NextResponse.json({ error: 'Failed to delete certification' }, { status: 500 })
  }
}
