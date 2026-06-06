"use strict";
const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");
function loadEnv() {
  const lines = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8").split("\n");
  for (const l of lines) { const m = l.match(/^([^=#\s][^=]*)=(.*)$/); if (m) process.env[m[1].trim()] = m[2].trim(); }
}
loadEnv();
(async () => {
  const c = new MongoClient(process.env.MONGODB_URI);
  await c.connect();
  const dealers = await c.db().collection("gem_dealers")
    .find({ l1_wins: { $gte: 1 } }, { projection: { canonical_name: 1, l1_wins: 1, opportunity_score: 1, departments: 1, states: 1, defence_l1: 1, municipal_l1: 1 } })
    .sort({ opportunity_score: -1 })
    .limit(25)
    .toArray();
  await c.close();
  console.log(JSON.stringify(dealers, null, 2));
})().catch(e => { console.error(e.message); process.exit(1); });
