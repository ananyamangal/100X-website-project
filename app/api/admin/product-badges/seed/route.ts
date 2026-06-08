// Seed product_badges from existing product badge strings.
// Safe to run multiple times — skips badges that already exist.
import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

const LEGACY_LOGOS: Record<string, string> = {
  'German Technology':  '/Logos clipart 2/german technology.png',
  'Japnese Technology': '/Logos clipart 2/Japnese technology.png',
  'Korean Technology':  '/Logos clipart 2/Korean Technology.png',
  'GeM':                '/Logos clipart 2/GeM logo.png',
  'GeM logo':           '/Logos clipart 2/GeM logo.png',
  'GeM Registered':     '/Logos clipart 2/GeM logo.png',
  'GeM Approved':       '/Logos clipart 2/GeM logo.png',
  'Heavy Duty':         '/Logos clipart 2/Heavy duty.png',
  'Heavy duty':         '/Logos clipart 2/Heavy duty.png',
  'Eco Friendly':       '/Logos clipart 2/Ecofreidly.png',
  'Ecofreidly':         '/Logos clipart 2/Ecofreidly.png',
  'BIS Approved':       '/Logos clipart 2/BIS approved.png',
  'BIS':                '/Logos clipart 2/BIS approved.png',
}

function detectColor(name: string): { color: string; colorClass: string } {
  const n = name.toLowerCase()
  if (n.includes('gem') || n.includes('bis') || n.includes('gov'))
    return { color: '#2563eb', colorClass: 'bg-blue-100 text-blue-800' }
  if (n.includes('eco') || n.includes('green') || n.includes('made in india'))
    return { color: '#16a34a', colorClass: 'bg-green-100 text-green-800' }
  if (n.includes('best seller') || n.includes('top'))
    return { color: '#dc2626', colorClass: 'bg-red-100 text-red-800' }
  if (n.includes('german') || n.includes('korean') || n.includes('japan') || n.includes('tech'))
    return { color: '#4f46e5', colorClass: 'bg-indigo-100 text-indigo-800' }
  if (n.includes('heavy') || n.includes('duty') || n.includes('precision'))
    return { color: '#d97706', colorClass: 'bg-amber-100 text-amber-800' }
  if (n.includes('new') || n.includes('launch'))
    return { color: '#0d9488', colorClass: 'bg-teal-100 text-teal-800' }
  if (n.includes('budget'))
    return { color: '#9333ea', colorClass: 'bg-purple-100 text-purple-800' }
  return { color: '#6b7280', colorClass: 'bg-gray-100 text-gray-800' }
}

export async function POST() {
  try {
    const client = await clientPromise
    const db = client.db()

    // Collect all unique badge names from products
    const products = await db.collection('products')
      .find({}, { projection: { badges: 1, name: 1 } })
      .toArray()

    const nameCount: Record<string, number> = {}
    for (const p of products) {
      for (const b of (p.badges as string[] | undefined) ?? []) {
        if (typeof b === 'string' && b.trim()) {
          nameCount[b.trim()] = (nameCount[b.trim()] || 0) + 1
        }
      }
    }

    // Fetch existing badges to skip duplicates
    const existing = await db.collection('product_badges').find({}).toArray()
    const existingNames = new Set(existing.map((b: any) => String(b.name).toLowerCase()))

    const maxDoc = await db.collection('product_badges').find({}).sort({ order: -1 }).limit(1).toArray()
    let nextOrder = maxDoc.length > 0 ? (maxDoc[0].order ?? 0) + 1 : 0

    const created: string[] = []
    const skipped: string[] = []

    for (const [name, count] of Object.entries(nameCount)) {
      if (existingNames.has(name.toLowerCase())) {
        skipped.push(name)
        continue
      }
      const { color, colorClass } = detectColor(name)
      const iconUrl = LEGACY_LOGOS[name] || ''
      await db.collection('product_badges').insertOne({
        name,
        iconUrl,
        color,
        colorClass,
        priority: 0,
        isActive: true,
        tooltipText: '',
        order: nextOrder++,
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
      totalUniqueBadges: Object.keys(nameCount).length,
    })
  } catch (error) {
    console.error('Error seeding product badges:', error)
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 })
  }
}
