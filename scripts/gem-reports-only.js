"use strict"
// Standalone script — generates all 6 final reports from MongoDB without touching checkpoint
// Usage: node scripts/gem-reports-only.js

const path = require("path")
const fs   = require("fs")
const { MongoClient } = require("mongodb")

;(function loadEnv() {
  const lines = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8").split("\n")
  for (const l of lines) {
    const m = l.match(/^([^#=\s][^=]*)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim()
  }
})()

// Re-use generateFinalReports from gem-full-harvest.js
const { generateFinalReports } = require("./gem-full-harvest.js")

;(async () => {
  const client = new MongoClient(process.env.MONGODB_URI)
  await client.connect()
  const db = client.db()
  await generateFinalReports(db)
  await client.close()
  console.log("\nDone.")
})().catch(e => { console.error(e); process.exit(1) })
