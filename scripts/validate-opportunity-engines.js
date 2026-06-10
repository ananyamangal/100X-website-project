#!/usr/bin/env node
/**
 * READ-ONLY validation of BOTH segmented engines with the tight, category-aware taxonomy.
 *   1) Dealer Opportunity Engine   — equipment SELLERS (Tier A/B)
 *   2) Machine Buyer Opportunity   — chemical/ULV BUYERS + proven machine buyers
 * Writes nothing. Shows qualifying lists, scores, reasons, geography, contacts, false positives.
 */
;(function loadEnv(){const fs=require("fs"),path=require("path");for(const f of[".env.local",".env"]){const p=path.join(__dirname,"..",f);if(!fs.existsSync(p))continue;for(const l of fs.readFileSync(p,"utf8").split("\n")){const m=l.match(/^([^#=]+)=(.*)$/);if(m&&!process.env[m[1].trim()])process.env[m[1].trim()]=m[2].trim().replace(/^["']|["']$/g,"")}}})()
const { MongoClient } = require("mongodb")

// ---- Tight taxonomy (proven high-precision on this corpus) ----
const TIER_A = /thermal\s*fog|\bfogger\b|fogging\s*machine|fog\s*sanitizer|cold\s*fog|mist\s*blow|aero\s*blast|power\s*sprayer|knapsack\s*sprayer|compression\s*knapsack|hand\s*operated\s*sprayer|tractor\s*(operated|mounted)\s*sprayer|vehicle\s*mount\w*\s*fog|\bULV\b/i
const TIER_B = /brush\s*cutter|power\s*tiller|power\s*weeder|\breaper\b|chaff\s*cutter|mist\s*fan|nebuliz|atomiz/i
const CHEM   = /deltamethrin|cypermethrin|malathion|temephos|permethrin|fenitrothion|propoxur|larvicid|adulticid|super\s*white\s*fog|kingfog|pyrethr/i
const EXCLUDE = /air\s*freshener|freshener|mosquito\s*net|netting|repell[ae]nt\s*(lotion|spray|refill|coil|cream)|shuttlecock|forceps|naphthalene|incense|agarbatti|duster|white\s*board|vaporizer|liquid\s*vaporizer/i

const FIELDS = ["product_name", "product_desc", "category_name"]
const text = (r) => FIELDS.map(f => r[f] || "").join("  ").trim()
function classify(t) {
  if (EXCLUDE.test(t) && !TIER_A.test(t) && !TIER_B.test(t) && !CHEM.test(t)) return null
  if (TIER_A.test(t)) return "A"
  if (CHEM.test(t)) return "CHEM"
  if (TIER_B.test(t)) return "B"
  return null
}
const fmtCr = (n) => `₹${((n||0)/1e7).toFixed(3)} Cr`
const daysAgo = (iso) => iso ? Math.floor((Date.now() - new Date(iso).getTime())/86400000) : null
const recScore = (d) => d==null?0.1:d<=90?1:d<=180?0.8:d<=365?0.6:d<=730?0.3:0.1
const BUYER_TYPE = /municipal|nagar|panchayat|corporation|cantonment|\bhealth\b|medical|nvbdcp|\bnhm\b|malaria|vector|forest|agricultur|horticultur|urban|public\s*health|nigam|parishad/i

;(async () => {
  const client = new MongoClient(process.env.MONGODB_URI); await client.connect()
  const db = client.db(); const gc = db.collection("gem_contracts")
  const L = (s="") => console.log(s)

  // Pull every contract whose text hits the taxonomy (small set)
  const re = new RegExp([TIER_A.source, TIER_B.source, CHEM.source].join("|"), "i")
  const rows = await gc.find({ $or: FIELDS.map(f => ({ [f]: { $regex: re } })) }).toArray()

  // ---------------- DEALER STREAM (sellers of equipment A/B) ----------------
  const dealers = new Map()
  for (const r of rows) {
    const t = text(r); const cls = classify(t)
    if (cls !== "A" && cls !== "B") continue
    const name = r.seller_name_canonical; if (!name) continue
    const d = dealers.get(name) || { name, tierA:false, contracts:0, gmv:0, last:null, states:new Set(), products:new Set(), phone:null, gst:null, msme:null, buyers:new Set() }
    if (cls === "A") d.tierA = true
    d.contracts++; d.gmv += r.contract_value_num||0
    if (r.contract_date_dt && (!d.last || r.contract_date_dt > d.last)) d.last = r.contract_date_dt
    if (r.seller_state) d.states.add(r.seller_state)
    if (r.product_name) d.products.add(r.product_name.slice(0,70))
    if (r.org_name && r.org_name!=="N/A") d.buyers.add(r.org_name)
    d.phone = d.phone || r.seller_phone; d.gst = d.gst || r.seller_gst; d.msme = d.msme || r.seller_msme_category
    dealers.set(name, d)
  }
  const maxDgmv = Math.max(...Array.from(dealers.values()).map(d=>d.gmv), 1)
  const dealerList = Array.from(dealers.values()).map(d => {
    const fit = d.tierA ? 1.0 : 0.6
    const vol = Math.log1p(d.gmv)/Math.log1p(maxDgmv)
    const rec = recScore(daysAgo(d.last))
    const contact = (d.phone?0.5:0)+(d.gst?0.3:0)+(d.msme?0.2:0)
    const score = Math.round((45*fit + 20*vol + 20*rec + 15*contact)*10)/10
    return { ...d, fit, score, rec, vol, contact, lastDays: daysAgo(d.last) }
  }).sort((a,b)=> b.score-a.score)

  // ---------------- MACHINE BUYER STREAM (chemical buyers + machine buyers) ----------------
  const buyers = new Map()
  for (const r of rows) {
    const t = text(r); const cls = classify(t)
    if (!cls) continue
    const key = (r.org_name && r.org_name!=="N/A") ? r.org_name : (r.dept_name || r.office_name)
    if (!key) continue
    const intent = cls==="CHEM" ? 1.0 : cls==="A" ? 0.8 : 0.55 // chem=needs machine, A=proven machine buyer
    const b = buyers.get(key) || { key, dept:r.dept_name, bestIntent:0, signals:new Set(), contracts:0, gmv:0, last:null, state:null, email:null, contact:null, address:null, products:new Set() }
    b.bestIntent = Math.max(b.bestIntent, intent)
    b.signals.add(cls==="CHEM"?"chemical/ULV":cls==="A"?"fogging/sprayer machine":"agri/vector equip")
    b.contracts++; b.gmv += r.contract_value_num||0
    if (r.contract_date_dt && (!b.last || r.contract_date_dt > b.last)) b.last = r.contract_date_dt
    b.state = b.state || r.buyer_state || r.seller_state
    b.email = b.email || r.buyer_email; b.contact = b.contact || r.buyer_contact; b.address = b.address || r.buyer_address
    if (r.product_name) b.products.add(r.product_name.slice(0,70))
    buyers.set(key, b)
  }
  const buyerList = Array.from(buyers.values()).map(b => {
    const typeFit = BUYER_TYPE.test(`${b.key} ${b.dept||""}`) ? 1 : 0.4
    const rec = recScore(daysAgo(b.last))
    const contact = (b.contact?0.5:0)+(b.email?0.3:0)+(b.state?0.2:0)
    const score = Math.round((45*b.bestIntent + 20*typeFit + 15*rec + 20*contact)*10)/10
    return { ...b, typeFit, rec, contact, score, lastDays: daysAgo(b.last) }
  }).sort((a,b)=> b.score-a.score)

  // ---------------- OUTPUT ----------------
  L("="*0 + "SEGMENTED OPPORTUNITY VALIDATION — tight category-aware taxonomy (read-only)")
  L(`Scanned ${rows.length} taxonomy-matched contracts from 16,011.`)

  L(`\n${"#".repeat(70)}\n# A. DEALER OPPORTUNITIES (equipment sellers) — ${dealerList.length} qualify\n${"#".repeat(70)}`)
  dealerList.forEach((d,i)=>{
    L(`\n${i+1}. ${d.name}   [${d.score}/100]  ${d.tierA?"Tier A (fogging/sprayer machine)":"Tier B (agri/vector equip)"}`)
    L(`   Geography: ${Array.from(d.states).join(", ")||"—"}  |  GeM: ${d.contracts} contracts, ${fmtCr(d.gmv)}${d.lastDays!=null?`, last ${d.lastDays}d ago`:""}`)
    L(`   Why ranked: fit ${Math.round(d.fit*100)}% (${(45*d.fit).toFixed(0)}) + vol ${(20*d.vol).toFixed(0)} + recency ${(20*d.rec).toFixed(0)} + contact ${(15*d.contact).toFixed(0)}`)
    L(`   Product-fit: ${Array.from(d.products).slice(0,2).join(" | ")}`)
    L(`   Buyers served: ${Array.from(d.buyers).slice(0,2).join(", ")||"—"}`)
    L(`   Contact: ${d.phone||"NO PHONE"}${d.gst?" · GST "+d.gst:""}${d.msme?" · "+d.msme:""}`)
    L(`   Next: ${d.tierA?"OEM authorization + dealer onboarding (already sells fogging/sprayer machines)":"Introduce 100X fogging/sprayer range to existing agri-equipment channel"}`)
  })

  L(`\n\n${"#".repeat(70)}\n# B. MACHINE BUYER OPPORTUNITIES (chemical/ULV + machine buyers) — ${buyerList.length} qualify\n${"#".repeat(70)}`)
  buyerList.forEach((b,i)=>{
    L(`\n${i+1}. ${b.key}   [${b.score}/100]`)
    L(`   Dept: ${b.dept||"—"}  |  Geography: ${b.state||"—"}`)
    L(`   Signals: ${Array.from(b.signals).join(", ")}  |  ${b.contracts} contracts, ${fmtCr(b.gmv)}${b.lastDays!=null?`, last ${b.lastDays}d ago`:""}`)
    L(`   Why ranked: intent ${Math.round(b.bestIntent*100)}% (${(45*b.bestIntent).toFixed(0)}) + buyer-type ${(20*b.typeFit).toFixed(0)} + recency ${(15*b.rec).toFixed(0)} + contact ${(20*b.contact).toFixed(0)}`)
    L(`   What they bought: ${Array.from(b.products).slice(0,2).join(" | ")}`)
    L(`   Contact: ${b.contact||"no phone"}${b.email?" · "+b.email:""}`)
    L(`   Next: Direct machine sale — they ${Array.from(b.signals).includes("chemical/ULV")?"buy fogging CHEMICALS but may lack/need machines":"already operate machines (repeat/AMC/upgrade)"}`)
  })

  // false-positive audit: what EXCLUDE caught that we dropped
  const dropped = rows.filter(r=>{const t=text(r); return EXCLUDE.test(t) && !TIER_A.test(t)&&!TIER_B.test(t)&&!CHEM.test(t)})
  L(`\n\n### FALSE-POSITIVE AUDIT`)
  L(`  Taxonomy-adjacent contracts excluded as noise: ${dropped.length}`)
  L(`  Sample dropped: ${dropped.slice(0,6).map(r=>r.product_name).filter(Boolean).join(" | ")}`)
  L(`  Dealers with no phone: ${dealerList.filter(d=>!d.phone).length}/${dealerList.length} | Buyers with no contact: ${buyerList.filter(b=>!b.contact).length}/${buyerList.length}`)

  await client.close()
})().catch(e=>{console.error(e);process.exit(1)})
