"use strict"
const fs = require("fs"), path = require("path")
let MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  const envPath = path.join(__dirname, "..", ".env.local")
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const [k, ...v] = line.split("=")
      if (k?.trim() === "MONGODB_URI") { MONGODB_URI = v.join("=").trim(); break }
    }
  }
}
const { MongoClient } = require("mongodb")
;(async () => {
  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 8000 })
  await client.connect()
  const db = client.db()
  const bids = await db.collection("bid_lifecycle")
    .find({ bid_number: { $in: ["GEM/2025/B/5840890", "GEM/2025/B/5854882"] } })
    .toArray()
  console.log(JSON.stringify(bids, null, 2))
  await client.close()
})().catch(e => { console.error(e.message); process.exit(1) })
