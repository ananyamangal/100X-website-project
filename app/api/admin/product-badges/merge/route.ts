// Merge one badge into another.
// All products using `fromName` will have their badge renamed to `toName`.
// The `fromName` badge entry is then deleted.
import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function POST(request: NextRequest) {
  try {
    const { fromName, toId } = await request.json()
    if (!fromName || !toId) {
      return NextResponse.json({ error: 'fromName and toId are required' }, { status: 400 })
    }
    if (!ObjectId.isValid(toId)) {
      return NextResponse.json({ error: 'Invalid toId' }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db()

    // Get target badge name
    const targetBadge = await db.collection('product_badges').findOne({ _id: new ObjectId(toId) })
    if (!targetBadge) return NextResponse.json({ error: 'Target badge not found' }, { status: 404 })

    const toName: string = targetBadge.name

    // Update all products: replace fromName with toName in badges array
    const updateResult = await db.collection('products').updateMany(
      { badges: fromName },
      { $set: { 'badges.$[el]': toName } },
      { arrayFilters: [{ el: fromName }] },
    )

    // Delete the source badge from product_badges
    const deleteResult = await db.collection('product_badges').deleteOne({ name: fromName })

    return NextResponse.json({
      success: true,
      productsUpdated: updateResult.modifiedCount,
      sourceDeleted: deleteResult.deletedCount > 0,
      mergedInto: toName,
    })
  } catch (error) {
    console.error('Error merging badges:', error)
    return NextResponse.json({ error: 'Merge failed' }, { status: 500 })
  }
}
