import { MongoClient } from "mongodb"
const uri = process.env.MONGODB_URI
const client = new MongoClient(uri)
await client.connect()
const db = client.db()

const syncDates = await db.collection("ads_conversion_rows").distinct("syncDate")
console.log("ads_conversion_rows distinct syncDates:", syncDates)

const names = await db.collection("ads_conversion_rows").find({}).project({ name: 1, category: 1, allConversions: 1, _id: 0 }).toArray()
console.log("\nAll conversion actions:")
names.forEach((n) => console.log(`  ${n.name} [${n.category}] allConversions=${n.allConversions}`))

const brochureRelated = names.filter((n) => /brochure/i.test(n.name || ""))
console.log("\nBrochure-related conversion actions:", JSON.stringify(brochureRelated, null, 2))

// Check ads_syncs / any collection with ongoing sync history
const adsSyncDates = await db.collection("ads_syncs").find({}).project({ syncedAt: 1, syncDate: 1 }).sort({ syncedAt: -1 }).limit(10).toArray()
console.log("\nads_syncs recent runs:", JSON.stringify(adsSyncDates, null, 2))

await client.close()
