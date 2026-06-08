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

    const current = await db.collection('product_badges').findOne({ _id: new ObjectId(id) })
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // If order changed, shift adjacent documents
    if (update.order !== undefined && update.order !== current.order) {
      const oldOrder = current.order
      const newOrder = update.order
      if (newOrder < oldOrder) {
        await db.collection('product_badges').updateMany(
          { _id: { $ne: new ObjectId(id) }, order: { $gte: newOrder, $lt: oldOrder } },
          { $inc: { order: 1 } },
        )
      } else {
        await db.collection('product_badges').updateMany(
          { _id: { $ne: new ObjectId(id) }, order: { $gt: oldOrder, $lte: newOrder } },
          { $inc: { order: -1 } },
        )
      }
    }

    await db.collection('product_badges').updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...update, updatedAt: new Date() } },
    )
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating product badge:', error)
    return NextResponse.json({ error: 'Failed to update product badge' }, { status: 500 })
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

    const doc = await db.collection('product_badges').findOne({ _id: new ObjectId(id) })
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await db.collection('product_badges').deleteOne({ _id: new ObjectId(id) })

    // Compact order values after deletion
    if (doc.order !== undefined) {
      await db.collection('product_badges').updateMany(
        { order: { $gt: doc.order } },
        { $inc: { order: -1 } },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting product badge:', error)
    return NextResponse.json({ error: 'Failed to delete product badge' }, { status: 500 })
  }
}
