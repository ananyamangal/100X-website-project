const { MongoClient } = require('mongodb')
require('fs').readFileSync('.env.local','utf8').split('\n').forEach(l=>{
  const eq = l.indexOf('=')
  if(eq>0){ const k=l.slice(0,eq).trim(); const v=l.slice(eq+1).trim(); process.env[k]=v }
})
const uri = process.env.MONGODB_URI
const client = new MongoClient(uri)

async function buildScores(db) {
  const gc = db.collection('gem_contracts')
  const start = Date.now()

  // ── dealer_scores ─────────────────────────────────────────────────────────────
  const rawDealers = await gc.aggregate([
    { $match: { seller_name_canonical: { $nin: [null,''] } } },
    { $group: {
      _id: '$seller_name_canonical',
      total_contracts: { $sum: 1 },
      total_gmv: { $sum: '$contract_value_num' },
      depts: { $addToSet: '$dept_name' },
      states: { $addToSet: '$seller_state' },
      products: { $addToSet: '$product_name' },
      ministries: { $addToSet: '$ministry' },
      years: { $addToSet: { $substr: ['$contract_date_dt', 0, 4] } }
    }},
    { $project: {
      dealer: '$_id', _id:0,
      total_contracts: 1, total_gmv: 1,
      dept_count: { $size: { $filter: { input: '$depts', cond: { $ne: ['$$this', null] } } } },
      state_count: { $size: { $filter: { input: '$states', cond: { $ne: ['$$this', null] } } } },
      product_count: { $size: { $filter: { input: '$products', cond: { $ne: ['$$this', null] } } } },
      ministry_count: { $size: { $filter: { input: '$ministries', cond: { $ne: ['$$this', null] } } } },
      active_years: { $size: { $filter: { input: '$years', cond: { $ne: ['$$this', null] } } } }
    }},
    { $sort: { total_gmv: -1 } }
  ]).toArray()

  const maxGmv = Math.max(...rawDealers.map(d => d.total_gmv || 0)) || 1
  const maxContracts = Math.max(...rawDealers.map(d => d.total_contracts || 0)) || 1
  const maxDeptReach = Math.max(...rawDealers.map(d => d.dept_count || 0)) || 1
  const maxStateReach = Math.max(...rawDealers.map(d => d.state_count || 0)) || 1
  const maxProductBreadth = Math.max(...rawDealers.map(d => d.product_count || 0)) || 1

  const dealerRows = rawDealers.map(d => {
    const network_reach    = d.ministry_count * 2 + d.dept_count
    const state_reach      = (d.state_count || 0) / 36
    const category_breadth = (d.product_count || 0) / maxProductBreadth
    const dealer_score = Math.round(
      (d.total_gmv / maxGmv) * 30 +
      (d.total_contracts / maxContracts) * 25 +
      (d.dept_count / maxDeptReach) * 20 +
      (d.state_count / maxStateReach) * 15 +
      category_breadth * 10
    )
    return { ...d, network_reach, state_reach: parseFloat(state_reach.toFixed(4)), category_breadth: parseFloat(category_breadth.toFixed(4)), dealer_score }
  })

  const dealerColl = db.collection('gem_kg_dealer_scores')
  await dealerColl.deleteMany({})
  if(dealerRows.length) {
    await dealerColl.insertMany(dealerRows)
    await dealerColl.createIndex({dealer:1})
    await dealerColl.createIndex({dealer_score:-1})
    await dealerColl.createIndex({total_gmv:-1})
  }
  console.log('dealer_scores:', dealerRows.length)

  // ── dept_scores ───────────────────────────────────────────────────────────────
  const deptRows = await gc.aggregate([
    { $match: { dept_name: { $nin: [null,''] } } },
    { $group: {
      _id: '$dept_name',
      ministry: { $first: '$ministry' },
      total_contracts: { $sum: 1 },
      total_gmv: { $sum: '$contract_value_num' },
      sellers: { $addToSet: '$seller_name_canonical' },
      products: { $addToSet: '$product_name' },
      states: { $addToSet: '$state' }
    }},
    { $project: {
      dept: '$_id', _id:0, ministry: 1, total_contracts: 1, total_gmv: 1,
      seller_count: { $size: { $filter: { input: '$sellers', cond: { $ne: ['$$this', null] } } } },
      product_count: { $size: { $filter: { input: '$products', cond: { $ne: ['$$this', null] } } } },
      state_count: { $size: { $filter: { input: '$states', cond: { $ne: ['$$this', null] } } } }
    }},
    { $sort: { total_gmv: -1 } }
  ]).toArray()

  const concRows = await db.collection('gem_kg_dealer_dept').aggregate([
    { $group: { _id: '$dept', total_gmv: { $sum: '$total_gmv' }, max_gmv: { $max: '$total_gmv' } } }
  ]).toArray()
  const concMap = {}
  for(const r of concRows) concMap[r._id] = r.max_gmv / (r.total_gmv || 1)

  const deptFinal = deptRows.map(d => ({
    ...d,
    vendor_concentration: parseFloat((concMap[d.dept] || 0).toFixed(4))
  }))

  const deptColl = db.collection('gem_kg_dept_scores')
  await deptColl.deleteMany({})
  if(deptFinal.length) {
    await deptColl.insertMany(deptFinal)
    await deptColl.createIndex({dept:1})
    await deptColl.createIndex({total_gmv:-1})
  }
  console.log('dept_scores:', deptFinal.length)

  // ── product_scores ────────────────────────────────────────────────────────────
  const ytRows = await gc.aggregate([
    { $match: { product_name: { $nin: [null,''] }, contract_date_dt: { $nin: [null,''] } } },
    { $group: { _id: { product: '$product_name', year: { $substr: ['$contract_date_dt', 0, 4] } }, gmv: { $sum: '$contract_value_num' } } },
    { $sort: { '_id.year': 1 } }
  ]).toArray()

  const yearTrendMap = {}
  for(const r of ytRows) {
    const p = r._id.product; const y = r._id.year
    if(!yearTrendMap[p]) yearTrendMap[p] = {}
    yearTrendMap[p][y] = (yearTrendMap[p][y]||0) + r.gmv
  }

  const productRows = await gc.aggregate([
    { $match: { product_name: { $nin: [null,''] } } },
    { $group: {
      _id: '$product_name',
      total_contracts: { $sum: 1 },
      total_gmv: { $sum: '$contract_value_num' },
      depts: { $addToSet: '$dept_name' },
      sellers: { $addToSet: '$seller_name_canonical' },
      states: { $addToSet: '$state' }
    }},
    { $project: {
      product: '$_id', _id:0, total_contracts:1, total_gmv:1,
      dept_count: { $size: { $filter: { input: '$depts', cond: { $ne: ['$$this', null] } } } },
      seller_count: { $size: { $filter: { input: '$sellers', cond: { $ne: ['$$this', null] } } } },
      state_count: { $size: { $filter: { input: '$states', cond: { $ne: ['$$this', null] } } } }
    }},
    { $sort: { total_gmv: -1 } }
  ]).toArray()

  const productFinal = productRows.map(p => {
    const trend = yearTrendMap[p.product] || {}
    const years = Object.keys(trend).sort()
    let growth_rate = 0
    if(years.length >= 2) {
      const last = trend[years[years.length-1]] || 0
      const prev = trend[years[years.length-2]] || 1
      growth_rate = Math.round(((last - prev) / prev) * 100)
    }
    const fragmentation = p.seller_count > 0 ? parseFloat((1 - 1/p.seller_count).toFixed(4)) : 0
    const year_trend = years.map(y => ({ year: y, gmv: trend[y] }))
    return { ...p, growth_rate, fragmentation, year_trend }
  })

  const prodColl = db.collection('gem_kg_product_scores')
  await prodColl.deleteMany({})
  if(productFinal.length) {
    await prodColl.insertMany(productFinal)
    await prodColl.createIndex({product:1})
    await prodColl.createIndex({total_gmv:-1})
  }
  console.log('product_scores:', productFinal.length)

  return { elapsed: Date.now()-start, dealer_scores: dealerRows.length, dept_scores: deptFinal.length, product_scores: productFinal.length }
}

async function main() {
  await client.connect()
  const db = client.db()
  console.log('Building score collections...')
  const result = await buildScores(db)
  console.log('\nDone in', result.elapsed, 'ms')

  console.log('\n=== TOP 10 DEALERS BY SCORE ===')
  const dealers = await db.collection('gem_kg_dealer_scores').find().sort({dealer_score:-1}).limit(10).toArray()
  dealers.forEach((d,i)=>console.log((i+1)+'. '+d.dealer+' | score:'+d.dealer_score+' | GMV:'+Math.round((d.total_gmv||0)/1e7)+'Cr | contracts:'+d.total_contracts+' | depts:'+d.dept_count))

  console.log('\n=== TOP 10 DEPTS BY GMV ===')
  const depts = await db.collection('gem_kg_dept_scores').find().sort({total_gmv:-1}).limit(10).toArray()
  depts.forEach((d,i)=>console.log((i+1)+'. '+d.dept.slice(0,60)+' | GMV:'+Math.round((d.total_gmv||0)/1e7)+'Cr | sellers:'+d.seller_count))

  console.log('\n=== TOP 10 PRODUCTS BY GMV ===')
  const prods = await db.collection('gem_kg_product_scores').find().sort({total_gmv:-1}).limit(10).toArray()
  prods.forEach((d,i)=>console.log((i+1)+'. '+d.product.slice(0,60)+' | GMV:'+Math.round((d.total_gmv||0)/1e7)+'Cr | contracts:'+d.total_contracts+' | sellers:'+d.seller_count))

  await client.close()
}

main().catch(e=>{console.error(e.message);process.exit(1)})
