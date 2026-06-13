import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

const ALLOWED = new Set(['whatsapp_click', 'call_click', 'rfq_start'])

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, string>
    const { event, page, source } = body

    if (!event || !ALLOWED.has(event)) {
      return NextResponse.json({ error: 'Invalid event' }, { status: 400 })
    }

    const client = await clientPromise
    await client.db().collection('analytics_events').insertOne({
      event,
      page: page || '',
      source: source || '',
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
