// POST /api/fogging/copilot
// Natural language query → MongoDB filter → contract results
// Powers the Fogging Copilot (P3) — "Show all Neptune contracts in Bihar"

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import clientPromise from '@/lib/mongodb';

const DB   = '100xDB';
const COLL = 'fogging_contracts';

const SYSTEM_PROMPT = `You are a query parser for a thermal fogging machine procurement database (GeM India).
Convert the user's natural language query into a MongoDB filter object (JSON).

Available fields and their types:
- oem_canonical (string): OEM brand key. Known values: "NEPTUNE", "SSE SAI SHREE ENTERPRISES", "PULSFOG", "INSTA FOG", "FOGGERS", "100X CIRCLE"
- oem_short_brand (string): Short brand label (e.g. "Neptune", "Pulsfog", "100X Circle")
- buyer_state (string): Indian state name e.g. "Bihar", "Uttar Pradesh", "Rajasthan"
- buyer_display_name (string): Full buyer/department name
- org_type (string): "Central Government", "State Government", "Urban Local Body", "Public Sector Undertaking", "Autonomous Body", "Local Bodies"
- ministry (string): Ministry name e.g. "Ministry of Defence"
- seller_name (string): Seller/dealer display name
- seller_gst (string): 15-digit GSTIN
- model_raw (string): Raw product model string from GeM
- model_normalized (string): Normalized model identifier
- contract_value_num (number): Contract value in INR rupees
- unit_price (number): Unit price in INR rupees
- quantity (number): Quantity ordered
- contract_date (date string ISO): Date of contract
- buying_mode (string): e.g. "GeM Pool", "Direct Purchase"
- is_100x (boolean): true if 100X Circle contract
- contract_year (number): Year (2019-2025)
- has_unit_price (boolean): true if unit price was extractable

Rules:
1. Use $regex with $options:"i" for text searches on names/models/buyer
2. Use $gte/$lte for number ranges
3. For OEM names, prefer oem_canonical with the exact key (uppercase) OR use $regex on oem_short_brand
4. For "lakh" amounts: 1 lakh = 100000; "10 lakh" = 1000000; "1 crore" = 10000000
5. For org types like "municipality": match org_type with {$regex:"Urban Local Body|municipality", $options:"i"}
6. For "100X" or "100x circle": use is_100x:true
7. For date ranges use ISODate strings: "2024-01-01" format
8. Return ONLY a JSON object with two keys:
   - "filter": the MongoDB filter object
   - "explanation": a one-sentence plain English description of what was filtered

Examples:
Q: "Show all Neptune contracts in Bihar"
A: {"filter":{"oem_canonical":"NEPTUNE","buyer_state":"Bihar"},"explanation":"All Neptune contracts where the buyer is in Bihar."}

Q: "Show all Royal Tradelinks sales"
A: {"filter":{"seller_name":{"$regex":"Royal Tradelinks","$options":"i"}},"explanation":"All contracts sold by Royal Tradelinks."}

Q: "Show all NPF-35 purchases"
A: {"filter":{"model_raw":{"$regex":"NPF-35","$options":"i"}},"explanation":"All contracts for the NPF-35 model."}

Q: "Show all contracts above 10 lakh"
A: {"filter":{"contract_value_num":{"$gte":1000000}},"explanation":"All contracts with value above ₹10 lakh."}

Q: "Show all purchases by e-Municipalities"
A: {"filter":{"org_type":{"$regex":"Urban Local Body","$options":"i"}},"explanation":"All contracts where the buyer is an Urban Local Body."}

Q: "Show 100X contracts in UP last year"
A: {"filter":{"is_100x":true,"buyer_state":"Uttar Pradesh","contract_year":2024},"explanation":"100X Circle contracts in Uttar Pradesh from 2024."}`;

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json() as { query?: string };
    const query  = (body.query ?? '').trim();

    if (!query || query.length < 3) {
      return NextResponse.json({ error: 'Query too short' }, { status: 400 });
    }
    if (query.length > 500) {
      return NextResponse.json({ error: 'Query too long' }, { status: 400 });
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
    }

    const anthropic = new Anthropic({ apiKey: anthropicKey });

    // Parse NL query → MongoDB filter
    const msg = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: query }],
    });

    const raw = (msg.content[0] as { type: string; text: string }).text?.trim() ?? '';

    // Extract JSON from the response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Could not parse query', raw }, { status: 422 });
    }

    let parsed: { filter?: Record<string, unknown>; explanation?: string };
    try {
      parsed = JSON.parse(jsonMatch[0]) as typeof parsed;
    } catch {
      return NextResponse.json({ error: 'Invalid filter JSON', raw }, { status: 422 });
    }

    const filter      = parsed.filter ?? {};
    const explanation = parsed.explanation ?? query;

    // Execute filter against fogging_contracts
    const client    = await clientPromise;
    const coll      = client.db(DB).collection(COLL);
    const [docs, total] = await Promise.all([
      coll.find(filter, {
        projection: {
          gemc_no: 1, contract_date: 1,
          buyer_display_name: 1, buyer_canonical: 1, buyer_state: 1, org_type: 1,
          oem_canonical: 1, oem_short_brand: 1, is_100x: 1,
          model_raw: 1,
          contract_value_num: 1, quantity: 1, unit_price: 1,
          seller_name: 1, seller_gst: 1,
          buying_mode: 1,
        },
      }).sort({ contract_date: -1 }).limit(200).toArray(),
      coll.countDocuments(filter),
    ]);

    // Summary aggregation
    const summaryArr = await coll.aggregate([
      { $match: filter },
      { $group: {
        _id:       null,
        total_gmv: { $sum: '$contract_value_num' },
        buyers:    { $addToSet: '$buyer_canonical' },
        oems:      { $addToSet: '$oem_canonical' },
        states:    { $addToSet: '$buyer_state' },
      }},
    ]).toArray();
    const s = summaryArr[0] ?? {};

    return NextResponse.json({
      query,
      explanation,
      filter,
      total,
      data:  docs,
      summary: {
        total_gmv:    s.total_gmv ?? 0,
        buyer_count:  (s.buyers ?? []).length,
        oem_count:    (s.oems   ?? []).length,
        state_count:  (s.states ?? []).length,
      },
    });
  } catch (e) {
    console.error('[fogging/copilot]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
