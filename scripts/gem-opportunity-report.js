#!/usr/bin/env node
// Opportunity intelligence report from enriched GeM contracts
;(function loadEnv() {
  const fs = require("fs"), path = require("path")
  const lines = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8").split("\n")
  for (const l of lines) {
    const m = l.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim()
  }
})()

const { MongoClient } = require("mongodb")

function inr(n) {
  if (!n) return "₹0"
  if (n >= 1e7) return "₹" + (n / 1e7).toFixed(2) + " Cr"
  if (n >= 1e5) return "₹" + (n / 1e5).toFixed(2) + " L"
  return "₹" + Math.round(n).toLocaleString("en-IN")
}

function bar(v, max, w) {
  w = w || 20
  const n = max > 0 ? Math.round((v / max) * w) : 0
  return "█".repeat(n) + "░".repeat(w - n)
}

const FOGGING_TERMS = [
  "fog", "mist", "spray", "pump", "chemical", "pesticide", "disinfect",
  "mosquito", "vector", "sanit", "hygien", "nozzle", "aerosol", "ulv", "thermal",
  "fumigat", "insect", "rodent", "pest", "vector control",
]

;(async () => {
  const client = new MongoClient(process.env.MONGODB_URI)
  await client.connect()
  const gc = client.db().collection("gem_contracts")

  const total = await gc.countDocuments()
  const gmvAgg = await gc.aggregate([{ $group: { _id: null, gmv: { $sum: "$contract_value_num" } } }]).toArray()
  const totalGmv = gmvAgg[0] ? gmvAgg[0].gmv : 0

  // A. Top sellers
  const sellers = await gc.aggregate([
    { $match: { seller_name_canonical: { $nin: [null, ""] } } },
    { $group: {
      _id: "$seller_name_canonical",
      contracts: { $sum: 1 }, gmv: { $sum: "$contract_value_num" },
      states: { $addToSet: "$seller_state" },
      gstin:  { $first: "$seller_gst" },
      phone:  { $first: "$seller_phone" },
      email:  { $first: "$seller_email" },
      msme:   { $first: "$seller_msme" },
      oem:    { $first: "$oem_indicator" },
      reseller: { $first: "$reseller_indicator" },
    }},
    { $sort: { gmv: -1 } }, { $limit: 15 },
  ]).toArray()

  // B. Top departments
  const depts = await gc.aggregate([
    { $match: { dept_name: { $nin: [null, ""] } } },
    { $group: {
      _id: "$dept_name",
      contracts: { $sum: 1 }, gmv: { $sum: "$contract_value_num" },
      ministries: { $addToSet: "$ministry" },
      states: { $addToSet: "$buyer_state" },
    }},
    { $sort: { gmv: -1 } }, { $limit: 15 },
  ]).toArray()

  // C. Top products
  const products = await gc.aggregate([
    { $match: { product_name: { $nin: [null, ""] } } },
    { $group: { _id: "$product_name", contracts: { $sum: 1 }, gmv: { $sum: "$contract_value_num" } } },
    { $sort: { gmv: -1 } }, { $limit: 20 },
  ]).toArray()

  // D. Dealer acquisition targets (reseller flag)
  const dealers = await gc.aggregate([
    { $match: { reseller_indicator: true, seller_name_canonical: { $nin: [null, ""] } } },
    { $group: {
      _id: "$seller_name_canonical",
      gmv: { $sum: "$contract_value_num" }, contracts: { $sum: 1 },
      state: { $first: "$seller_state" },
      phone: { $first: "$seller_phone" }, email: { $first: "$seller_email" },
      gstin: { $first: "$seller_gst" },
    }},
    { $sort: { gmv: -1 } }, { $limit: 20 },
  ]).toArray()

  // E. Fogging-adjacent products
  const allProds = await gc.aggregate([
    { $match: { product_name: { $nin: [null, ""] }, contract_value_num: { $gt: 0 } } },
    { $group: { _id: "$product_name", gmv: { $sum: "$contract_value_num" }, count: { $sum: 1 } } },
    { $sort: { gmv: -1 } },
  ]).toArray()
  const adjacent = allProds.filter(p => {
    const n = (p._id || "").toLowerCase()
    return FOGGING_TERMS.some(t => n.includes(t))
  })

  // F. Broad buyers (most product diversity)
  const broadBuyers = await gc.aggregate([
    { $match: { dept_name: { $nin: [null, ""] }, product_name: { $nin: [null, ""] } } },
    { $group: {
      _id: "$dept_name",
      products: { $addToSet: "$product_name" },
      gmv: { $sum: "$contract_value_num" },
      contracts: { $sum: 1 },
    }},
    { $addFields: { productCount: { $size: "$products" } } },
    { $sort: { productCount: -1 } }, { $limit: 15 },
  ]).toArray()

  // G. Ministries by reach (most contracts)
  const ministries = await gc.aggregate([
    { $match: { ministry: { $nin: [null, ""] } } },
    { $group: { _id: "$ministry", contracts: { $sum: 1 }, gmv: { $sum: "$contract_value_num" },
      depts: { $addToSet: "$dept_name" } }},
    { $sort: { contracts: -1 } }, { $limit: 15 },
  ]).toArray()

  // ── OUTPUT ─────────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(72))
  console.log("  OPPORTUNITY INTELLIGENCE REPORT")
  console.log("  " + total + " enriched contracts  |  Total GMV: " + inr(totalGmv))
  console.log("  " + new Date().toLocaleString("en-IN"))
  console.log("═".repeat(72))

  console.log("\n" + "─".repeat(72))
  console.log("  A. TOP 15 SELLERS BY GMV")
  console.log("─".repeat(72))
  const maxSG = sellers[0] ? sellers[0].gmv : 1
  sellers.forEach((s, i) => {
    const contact = [s.phone, s.email].filter(Boolean).join(" | ") || "—"
    const flags   = [s.oem && "OEM", s.reseller && "RESELLER", s.msme && "MSME"].filter(Boolean).join("/") || "—"
    const stList  = (s.states || []).filter(Boolean).join(", ") || "—"
    console.log("  " + String(i+1).padStart(2) + ". " + (s._id || "").slice(0, 40).padEnd(40) + " " + bar(s.gmv, maxSG, 14) + " " + inr(s.gmv).padStart(12) + " ×" + s.contracts)
    console.log("      " + flags + " | " + stList + " | " + contact)
  })

  console.log("\n" + "─".repeat(72))
  console.log("  B. TOP 15 DEPARTMENTS BY SPEND")
  console.log("─".repeat(72))
  depts.forEach((d, i) => {
    const minStr = (d.ministries || []).filter(Boolean).slice(0, 1).join("") || "—"
    console.log("  " + String(i+1).padStart(2) + ". " + (d._id || "").slice(0, 50).padEnd(50) + " " + inr(d.gmv).padStart(12) + " ×" + d.contracts)
    console.log("      Ministry: " + minStr.slice(0, 65))
  })

  console.log("\n" + "─".repeat(72))
  console.log("  C. TOP 20 PRODUCTS BY GMV")
  console.log("─".repeat(72))
  products.forEach((p, i) => {
    console.log("  " + String(i+1).padStart(2) + ". " + (p._id || "").slice(0, 58).padEnd(58) + " " + inr(p.gmv).padStart(12) + " ×" + p.contracts)
  })

  console.log("\n" + "─".repeat(72))
  console.log("  D. DEALER ACQUISITION TARGETS  (reseller-flagged)")
  console.log("─".repeat(72))
  if (dealers.length === 0) {
    console.log("  None flagged as resellers in current 30-day slice.")
    console.log("  NOTE: Historical 1,095-day collection will surface dealer network.")
  } else {
    dealers.forEach((d, i) => {
      const contact = [d.phone, d.email, d.gstin].filter(Boolean).join(" | ") || "no contact"
      console.log("  " + String(i+1).padStart(2) + ". " + (d._id || "").slice(0, 42).padEnd(42) + " " + inr(d.gmv).padStart(12) + " ×" + d.contracts + "  " + (d.state || "—"))
      console.log("      " + contact)
    })
  }

  console.log("\n" + "─".repeat(72))
  console.log("  E. PRODUCT EXPANSION — FOGGING/SPRAY/CHEMICAL ADJACENT")
  console.log("─".repeat(72))
  if (adjacent.length === 0) {
    console.log("  No fogging-adjacent products in current 30-day slice.")
    console.log("  Thermal fogging, ULV sprayers, disinfectants will surface in 1,095-day collection.")
  } else {
    adjacent.forEach((p, i) => {
      console.log("  " + (i+1) + ". " + (p._id || "").slice(0, 62) + " — " + inr(p.gmv) + " ×" + p.count)
    })
  }

  console.log("\n" + "─".repeat(72))
  console.log("  F. BROAD BUYERS — DEPARTMENTS BY PRODUCT DIVERSITY")
  console.log("─".repeat(72))
  broadBuyers.forEach((b, i) => {
    console.log("  " + String(i+1).padStart(2) + ". " + (b._id || "").slice(0, 52).padEnd(52) + " " + String(b.productCount).padStart(3) + " products  " + inr(b.gmv))
  })

  console.log("\n" + "─".repeat(72))
  console.log("  G. MINISTRIES BY CONTRACT REACH")
  console.log("─".repeat(72))
  ministries.forEach((m, i) => {
    const dCount = (m.depts || []).filter(Boolean).length
    console.log("  " + String(i+1).padStart(2) + ". " + (m._id || "").slice(0, 50).padEnd(50) + " " + String(m.contracts).padStart(4) + " contracts  " + dCount + " depts  " + inr(m.gmv))
  })

  console.log("\n" + "═".repeat(72))
  console.log("  END OF OPPORTUNITY REPORT")
  console.log("═".repeat(72) + "\n")

  await client.close()
})().catch(e => { console.error("FATAL:", e.message); process.exit(1) })
