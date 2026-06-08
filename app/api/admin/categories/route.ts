import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

const DEFAULTS = [
  "Vehicle mountable Fogging Machines",
  "Cold Foggers",
  "Agriculture Sprayers",
  "Power Weeders and Tillers",
  "Brush Cutter",
  "Lawn mower",
  "Water pumps",
  "Chain Saw",
  "Chaff Cutter",
  "seeders",
  "Trolleys",
]

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()
    const fromDb: string[] = await db.collection('products').distinct('category')
    const merged = Array.from(new Set([...DEFAULTS, ...fromDb.filter(Boolean)]))
    return NextResponse.json(merged.sort((a, b) => a.localeCompare(b)))
  } catch {
    return NextResponse.json(DEFAULTS)
  }
}
