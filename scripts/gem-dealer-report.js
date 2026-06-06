"use strict";
/**
 * gem-dealer-report.js  —  Phase 3 + Phase 4 analytics only
 * Reads from gem_awarded_bids + gem_dealers collections.
 * Run after gem-dealer-pipeline.js has populated the DB.
 */

const fs   = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

function loadMongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  const ep = path.join(__dirname, "..", ".env.local");
  if (fs.existsSync(ep)) {
    for (const l of fs.readFileSync(ep, "utf8").split("\n")) {
      const [k, ...v] = l.split("=");
      if (k?.trim() === "MONGODB_URI") return v.join("=").trim();
    }
  }
  throw new Error("MONGODB_URI not found");
}

function canonicalize(name) {
  if (!name) return null;
  return name.toUpperCase()
    .replace(/^(M\/S\.?\s*|M\/S\s*|MS\s+|SH\.\s*|SMT\.\s*|MR\.\s*|DR\.\s*)/, "")
    .replace(/\s+/g, " ").trim();
}

(async () => {
  const client = new MongoClient(loadMongoUri(), { serverSelectionTimeoutMS: 10000 });
  await client.connect();
  const db        = client.db();
  const bidCol    = db.collection("gem_awarded_bids");
  const dealerCol = db.collection("gem_dealers");

  const totalBids    = await bidCol.countDocuments();
  const totalDealers = await dealerCol.countDocuments();

  // ── Phase 3: Intelligence ────────────────────────────────────────────────

  // 3a. Top L1 winners
  const topL1 = await dealerCol
    .find({ l1_wins: { $gt: 0 } })
    .sort({ l1_wins: -1 })
    .limit(25)
    .toArray();

  // 3b. Top by department breadth
  const topByDepts = await dealerCol.aggregate([
    { $match: { l1_wins: { $gt: 0 } } },
    { $project: {
        canonical_name: 1, l1_wins: 1, departments: 1, states: 1, is_100x_dealer: 1,
        deptCount:  { $size: { $ifNull: ["$departments", []] } },
        stateCount: { $size: { $ifNull: ["$states", []] } },
    }},
    { $sort: { deptCount: -1, l1_wins: -1 } },
    { $limit: 15 }
  ]).toArray();

  // 3c. Top defence suppliers
  const defenceRx = /Indian Army|Air Force|Indian Navy|Coast Guard|DGQA|Defence|Ministry of Defence|DRDO/i;
  const defenceBids = await bidCol.find({ dept: { $regex: "Army|Air Force|Navy|Coast Guard|DGQA|Defence|DRDO", $options: "i" } }).toArray();
  const defMap = {};
  defenceBids.forEach(b => { if (b.l1_name) { const k = canonicalize(b.l1_name); defMap[k] = (defMap[k]||{count:0,name:b.l1_name}); defMap[k].count++; } });
  const topDefence = Object.values(defMap).sort((a,b)=>b.count-a.count).slice(0,15);

  // 3d. Top municipal suppliers
  const municipalBids = await bidCol.find({ dept: { $regex: "Nagar|Municipal|Palika|Nigam|Corporation|ULB|E-nagar|E-municipalities|Nagarpalika", $options: "i" } }).toArray();
  const munMap = {};
  municipalBids.forEach(b => { if (b.l1_name) { const k = canonicalize(b.l1_name); munMap[k] = (munMap[k]||{count:0,name:b.l1_name}); munMap[k].count++; } });
  const topMunicipal = Object.values(munMap).sort((a,b)=>b.count-a.count).slice(0,15);

  // 3e. Department distribution
  const deptDist = await bidCol.aggregate([
    { $match: { dept: { $ne: null } } },
    { $group: { _id: "$dept", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 }
  ]).toArray();

  // 3f. Keyword distribution
  const kwDist = await bidCol.aggregate([
    { $group: { _id: "$keyword", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();

  // 3g. Variant distribution
  const varDist = await bidCol.aggregate([
    { $group: { _id: "$variant", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();

  // ── Phase 4: OEM Authorization Targets ──────────────────────────────────

  const authTargets = await dealerCol.aggregate([
    { $match: { l1_wins: { $gte: 2 }, is_100x_dealer: false } },
    { $project: {
        canonical_name: 1, aliases: 1, l1_wins: 1, l2_count: 1, l3_count: 1,
        departments: 1, states: 1, bids: 1,
        deptCount:  { $size: { $ifNull: ["$departments", []] } },
        stateCount: { $size: { $ifNull: ["$states", []] } },
    }},
    { $addFields: { score: { $add: [
        { $multiply: ["$l1_wins", 3] },
        { $multiply: ["$deptCount", 2] },
        "$stateCount"
    ]}}},
    { $sort: { score: -1 } },
    { $limit: 30 }
  ]).toArray();

  // ── Print Report ─────────────────────────────────────────────────────────

  const sep = "─".repeat(72);
  console.log("\n" + "=".repeat(72));
  console.log("DEALER INTELLIGENCE REPORT — GeM Fogging Procurement");
  console.log("=".repeat(72));
  console.log(`\nDatabase: ${totalBids} awarded bids  |  ${totalDealers} canonical dealers`);

  console.log(`\n${sep}`);
  console.log("TOP 25 L1 WINNERS  (by win count)");
  console.log(sep);
  topL1.forEach((d, i) => {
    const depts  = (d.departments || []).length;
    const states = (d.states || []).length;
    const tag    = d.is_100x_dealer ? " [100X]" : "";
    console.log(
      `  ${String(i+1).padStart(2)}. ${(d.canonical_name+tag).slice(0,44).padEnd(44)}` +
      `  L1=${String(d.l1_wins).padStart(2)}  depts=${depts}  states=${states}`
    );
  });

  console.log(`\n${sep}`);
  console.log("TOP DEALERS BY DEPARTMENT BREADTH  (multi-department coverage)");
  console.log(sep);
  topByDepts.forEach((d, i) => {
    const deptList = (d.departments || []).slice(0,3).map(x=>x.slice(0,22)).join(", ");
    console.log(
      `  ${String(i+1).padStart(2)}. ${d.canonical_name.slice(0,42).padEnd(42)}` +
      `  L1=${d.l1_wins}  depts=${d.deptCount}  states=${d.stateCount}`
    );
    if (deptList) console.log(`      ↳ ${deptList}`);
  });

  console.log(`\n${sep}`);
  console.log("TOP DEFENCE SUPPLIERS  (Army / Air Force / Navy / Coast Guard / DGQA)");
  console.log(sep);
  topDefence.forEach((d, i) =>
    console.log(`  ${String(i+1).padStart(2)}. ${d.name.slice(0,55).padEnd(55)}  wins=${d.count}`)
  );

  console.log(`\n${sep}`);
  console.log("TOP MUNICIPAL SUPPLIERS  (Nagar Palika / Nigam / ULB / Corporation)");
  console.log(sep);
  topMunicipal.forEach((d, i) =>
    console.log(`  ${String(i+1).padStart(2)}. ${d.name.slice(0,55).padEnd(55)}  wins=${d.count}`)
  );

  console.log(`\n${sep}`);
  console.log("DEPARTMENT DISTRIBUTION  (top 20 buying departments)");
  console.log(sep);
  deptDist.forEach((d, i) =>
    console.log(`  ${String(i+1).padStart(2)}. ${d._id.slice(0,58).padEnd(58)}  ${d.count}`)
  );

  console.log(`\n${sep}`);
  console.log("KEYWORD COVERAGE");
  console.log(sep);
  kwDist.forEach(d => console.log(`  ${(d._id||"(none)").padEnd(25)}  ${d.count} bids`));

  console.log(`\n${sep}`);
  console.log("PAGE VARIANT DISTRIBUTION");
  console.log(sep);
  varDist.forEach(d => console.log(`  ${(d._id||"(none)").padEnd(20)}  ${d.count} bids`));

  console.log(`\n${sep}`);
  console.log("OEM AUTHORIZATION TARGETS  (score = L1×3 + depts×2 + states)");
  console.log("These dealers win fogging contracts across multiple orgs — prime 100X prospects");
  console.log(sep);
  authTargets.forEach((d, i) => {
    const deptList  = (d.departments || []).slice(0,3).map(x=>x.slice(0,25)).join(", ");
    const stateList = (d.states || []).slice(0,3).join(", ");
    const aliases   = (d.aliases || []).filter(a => canonicalize(a) !== d.canonical_name).slice(0,1);
    console.log(
      `  ${String(i+1).padStart(2)}. ${d.canonical_name.slice(0,42).padEnd(42)}` +
      `  score=${d.score}  L1=${d.l1_wins}  depts=${d.deptCount}  states=${d.stateCount}`
    );
    if (aliases.length)  console.log(`      Also listed as: ${aliases[0].slice(0,55)}`);
    if (deptList)        console.log(`      Depts: ${deptList}`);
    if (stateList)       console.log(`      States: ${stateList}`);
  });

  // Save JSON
  const reportPath = path.join(__dirname, "gem-dealer-report.json");
  const report = {
    generatedAt: new Date().toISOString(),
    totalBids, totalDealers,
    topL1: topL1.map(d => ({
      name: d.canonical_name, l1_wins: d.l1_wins, l2_count: d.l2_count, l3_count: d.l3_count,
      departments: d.departments, states: d.states, is_100x_dealer: d.is_100x_dealer,
    })),
    authTargets: authTargets.map(d => ({
      name: d.canonical_name, score: d.score, l1_wins: d.l1_wins,
      deptCount: d.deptCount, stateCount: d.stateCount,
      departments: d.departments, states: d.states, aliases: d.aliases,
      bids: d.bids,
    })),
    deptDistribution: deptDist.map(d => ({ dept: d._id, count: d.count })),
    topDefence: topDefence.map(d => ({ name: d.name, wins: d.count })),
    topMunicipal: topMunicipal.map(d => ({ name: d.name, wins: d.count })),
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReport saved → scripts/gem-dealer-report.json`);
  await client.close();
})().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
