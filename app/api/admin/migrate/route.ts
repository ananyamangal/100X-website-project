// Full product migration: converts string[] features/specs/applications to structured objects.
// Idempotent: items already in structured format are left unchanged.
// Run from Admin → Migration panel.
import { NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

function genId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

function migrateFeatures(val: unknown): object[] | null {
  if (!Array.isArray(val) || val.length === 0) return null
  if (typeof val[0] === 'object' && val[0] !== null && 'title' in val[0]) return null // already structured
  return val.map((item, i) => {
    const str = typeof item === 'string' ? item : String(item)
    const colonIdx = str.indexOf(':')
    return {
      id: genId(),
      title: colonIdx > -1 ? str.slice(0, colonIdx).trim() : str.trim(),
      value: colonIdx > -1 ? str.slice(colonIdx + 1).trim() : '',
      icon: '',
      image: '',
      tooltip: '',
      order: i,
    }
  })
}

function migrateSpecs(val: unknown): object[] | null {
  if (!Array.isArray(val) || val.length === 0) return null
  if (typeof val[0] === 'object' && val[0] !== null && 'label' in val[0]) return null
  return val.map((item, i) => {
    const str = typeof item === 'string' ? item : String(item)
    const colonIdx = str.indexOf(':')
    const label = colonIdx > -1 ? str.slice(0, colonIdx).trim() : str.trim()
    const value = colonIdx > -1 ? str.slice(colonIdx + 1).trim() : ''
    // Auto-assign group from label keywords
    const lc = label.toLowerCase()
    const group = lc.match(/engine|fuel|ignition|rpm|stroke/i) ? 'Mechanical'
      : lc.match(/tank|capacity|reservoir/i) ? 'Mechanical'
      : lc.match(/output|flow|coverage|spray|fog/i) ? 'Performance'
      : lc.match(/weight|dimension|length|width|height|size/i) ? 'Physical'
      : lc.match(/safety|compliance|certif|approved|standard|bis|ce|iso/i) ? 'Compliance'
      : lc.match(/voltage|amp|electric|power|watt/i) ? 'Electrical'
      : 'Other'
    return { id: genId(), label, value, group, icon: '', order: i }
  })
}

function migrateApplications(val: unknown): object[] | null {
  if (!Array.isArray(val) || val.length === 0) return null
  if (typeof val[0] === 'object' && val[0] !== null && 'title' in val[0]) return null
  return val.map((item, i) => {
    const str = typeof item === 'string' ? item : String(item)
    return {
      id: genId(),
      title: str.trim(),
      description: '',
      icon: '',
      image: '',
      industry: '',
      priority: i,
    }
  })
}

export async function POST() {
  try {
    const client = await clientPromise
    const db = client.db()

    const products = await db.collection('products').find({}).toArray()
    const report = {
      total: products.length,
      featuresMigrated: 0,
      specsMigrated: 0,
      applicationsMigrated: 0,
      alreadyStructured: 0,
      errors: 0,
    }

    for (const product of products) {
      const updates: Record<string, unknown> = { updatedAt: new Date() }
      let changed = false

      const newFeatures = migrateFeatures(product.features)
      if (newFeatures !== null) { updates.features = newFeatures; report.featuresMigrated++; changed = true }

      const newSpecs = migrateSpecs(product.specifications)
      if (newSpecs !== null) { updates.specifications = newSpecs; report.specsMigrated++; changed = true }

      const newApps = migrateApplications(product.applications)
      if (newApps !== null) { updates.applications = newApps; report.applicationsMigrated++; changed = true }

      if (!changed) { report.alreadyStructured++; continue }

      try {
        await db.collection('products').updateOne(
          { _id: product._id },
          { $set: updates },
        )
      } catch {
        report.errors++
      }
    }

    return NextResponse.json({ success: true, report })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 })
  }
}

// GET: preview what would be migrated without changing data
export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()
    const products = await db.collection('products')
      .find({}, { projection: { name: 1, features: 1, specifications: 1, applications: 1 } })
      .toArray()

    let needsFeatureMigration = 0
    let needsSpecMigration = 0
    let needsAppMigration = 0
    let alreadyStructured = 0

    for (const p of products) {
      const fNeed = migrateFeatures(p.features) !== null
      const sNeed = migrateSpecs(p.specifications) !== null
      const aNeed = migrateApplications(p.applications) !== null
      if (fNeed) needsFeatureMigration++
      if (sNeed) needsSpecMigration++
      if (aNeed) needsAppMigration++
      if (!fNeed && !sNeed && !aNeed) alreadyStructured++
    }

    return NextResponse.json({
      total: products.length,
      needsFeatureMigration,
      needsSpecMigration,
      needsAppMigration,
      alreadyStructured,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Preview failed' }, { status: 500 })
  }
}
