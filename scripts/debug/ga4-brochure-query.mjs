#!/usr/bin/env node
// One-shot attempt: refresh the stored Google OAuth token and pull GA4
// generate_lead / brochure_download event counts for the bug window.
// Single try, no retry loop — if the refresh token is invalid against the
// rotated client secret, this reports that and stops.
import { MongoClient } from "mongodb"

const uri = process.env.MONGODB_URI
const clientId = (process.env.GOOGLE_OAUTH_CLIENT_ID || "").trim()
const clientSecret = (process.env.GOOGLE_OAUTH_CLIENT_SECRET || "").trim()
const PROPERTY_ID = "520046025"

if (!uri || !clientId || !clientSecret) {
  console.error("Missing MONGODB_URI / GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET")
  process.exit(1)
}

const mongo = new MongoClient(uri)
await mongo.connect()
const db = mongo.db()
const tokenDoc = await db.collection("google_oauth_tokens").findOne({ _docId: "google-oauth-singleton" })
await mongo.close()

if (!tokenDoc?.refreshToken) {
  console.log("RESULT: no stored refresh token found in google_oauth_tokens — nothing to try.")
  process.exit(0)
}
console.log("Found stored refresh token, connected email:", tokenDoc.connectedEmail || "(unknown)")

// Step 1: refresh
let accessToken
try {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: tokenDoc.refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }).toString(),
  })
  const body = await res.json()
  if (!res.ok) {
    console.log(`RESULT: token refresh FAILED (${res.status}): ${JSON.stringify(body)}`)
    if (body.error === "invalid_grant") {
      console.log("RESULT: this is the invalid_grant wall — refresh token is not valid against the rotated client secret. Needs a full OAuth consent re-flow. Stopping, not retrying.")
    }
    process.exit(0)
  }
  accessToken = body.access_token
  console.log("Token refresh succeeded.")
} catch (err) {
  console.log("RESULT: token refresh threw an exception:", String(err))
  process.exit(0)
}

// Step 2: try the richest query first (eventName + custom lead_type dimension)
async function runReport(dimensions, metrics, startDate, endDate) {
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      dimensions: dimensions.map((name) => ({ name })),
      metrics: metrics.map((name) => ({ name })),
      dateRanges: [{ startDate, endDate }],
      limit: 250,
    }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(`GA4 Data API ${res.status}: ${JSON.stringify(body).slice(0, 500)}`)
  return body
}

const START = "2026-05-31"
const END = new Date().toISOString().slice(0, 10)

try {
  const rich = await runReport(["eventName", "customEvent:lead_type"], ["eventCount"], START, END)
  console.log(`\nGA4 report (eventName x lead_type, ${START} to ${END}):`)
  console.log(JSON.stringify(rich, null, 2))
} catch (err) {
  console.log("\nRich query (with customEvent:lead_type) failed:", String(err))
  console.log("Falling back to eventName-only breakdown...")
  try {
    const basic = await runReport(["eventName"], ["eventCount"], START, END)
    console.log(`\nGA4 report (eventName only, ${START} to ${END}):`)
    console.log(JSON.stringify(basic, null, 2))
  } catch (err2) {
    console.log("RESULT: eventName-only query also failed:", String(err2))
  }
}
