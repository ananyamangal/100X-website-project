import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { DEFAULT_HOME_CONTENT } from '@/lib/homeContent'

const KEY = 'main'

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()
    const doc = await db.collection('home_content').findOne({ key: KEY })
    if (!doc) return NextResponse.json(DEFAULT_HOME_CONTENT)
    const { _id, key, ...rest } = doc as any
    return NextResponse.json({ ...DEFAULT_HOME_CONTENT, ...rest })
  } catch {
    return NextResponse.json(DEFAULT_HOME_CONTENT)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const client = await clientPromise
    const db = client.db()
    const update = { ...body, updatedAt: new Date() }
    await db.collection('home_content').updateOne(
      { key: KEY },
      { $set: update },
      { upsert: true }
    )
    return NextResponse.json(update)
  } catch (error) {
    console.error('Error saving home content:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
