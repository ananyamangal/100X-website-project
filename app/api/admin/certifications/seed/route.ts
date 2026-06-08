// Seed certifications CMS collection from existing products.certifications[] strings.
// Idempotent — skips names that already exist (case-insensitive).
import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

const KNOWN_LOGOS: Record<string, string> = {
  'BIS Approved':               '/Logos clipart 2/BIS approved.png',
  'BIS Certified':              '/Logos clipart 2/BIS approved.png',
  'GeM Registered OEM':         '/Logos clipart 2/GeM logo.png',
  'GeM Registered':             '/Logos clipart 2/GeM logo.png',
  'GeM':                        '/Logos clipart 2/GeM logo.png',
  'MSME Registered':            '',
  'MSME/UDYAM Registered':      '',
  'Startup India':               '',
  'ISO 9001:2015':               '',
  'CE Marking':                  '',
  'CE Marked':                   '',
}

export async function POST() {
  try {
    const client = await clientPromise
    const db = client.db()

    // Collect all unique certification strings from products
    const products = await db.collection('products')
      .find({}, { projection: { certifications: 1, name: 1 } })
      .toArray()

    const nameCount: Record<string, number> = {}
    for (const p of products) {
      const certs = Array.isArray(p.certifications) ? p.certifications : []
      for (const c of certs) {
        if (typeof c === 'string' && c.trim()) {
          const key = c.trim()
          nameCount[key] = (nameCount[key] || 0) + 1
        }
      }
    }

    if (Object.keys(nameCount).length === 0) {
      return NextResponse.json({ success: true, created: 0, skipped: 0, message: 'No legacy certification strings found in products' })
    }

    // Get existing to skip
    const existing = await db.collection('certifications').find({}).toArray()
    const existingNames = new Set(existing.map((c: any) => String(c.name || '').toLowerCase().trim()))

    const maxDoc = await db.collection('certifications').find({}).sort({ sortOrder: -1 }).limit(1).toArray()
    let nextOrder = maxDoc.length > 0 ? ((maxDoc[0].sortOrder as number) ?? 0) + 1 : 0

    const created: string[] = []
    const skipped: string[] = []

    for (const [name, count] of Object.entries(nameCount).sort((a, b) => b[1] - a[1])) {
      if (existingNames.has(name.toLowerCase().trim())) {
        skipped.push(name)
        continue
      }
      await db.collection('certifications').insertOne({
        name,
        logoUrl: KNOWN_LOGOS[name] || '',
        description: '',
        verificationUrl: '',
        isActive: true,
        sortOrder: nextOrder++,
        legacyString: name,
        usageCount: count,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      created.push(name)
    }

    return NextResponse.json({
      success: true,
      created: created.length,
      skipped: skipped.length,
      createdNames: created,
      skippedNames: skipped,
    })
  } catch (error) {
    console.error('Error seeding certifications:', error)
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 })
  }
}
