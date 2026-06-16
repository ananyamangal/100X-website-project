// POST /api/fogging/copilot
// Natural language query → intent detection → MongoDB filter → results
// Supports: fogging_contracts (purchase queries) + fogging_sellers (dealer queries)

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import clientPromise from '@/lib/mongodb';

const DB = '100xDB';

const SYSTEM_PROMPT = `You are a query parser for a thermal fogging machine procurement intelligence platform (GeM India).

Classify the query intent and return a MongoDB filter.

## QUERY TYPES

### "contracts" — purchase/order/OEM/state/price queries
Fields available in fogging_contracts:
- oem_canonical (string): "NEPTUNE", "SSE SAI SHREE ENTERPRISES", "PULSFOG", "INSTA FOG", "FOGGERS", "100X CIRCLE"
- oem_short_brand (string): short brand label e.g. "Neptune", "Pulsfog", "100X Circle"
- buyer_state (string): Indian state name e.g. "Bihar", "Uttar Pradesh"
- buyer_display_name (string): full buyer/department name
- org_type (string): "Central Government", "State Government", "Urban Local Body", "Public Sector Undertaking"
- ministry (string): ministry name
- seller_name (string): seller/dealer name
- seller_gst (string): 15-digit GSTIN
- model_raw (string): product model string from GeM
- model_normalized (string): normalized model identifier
- contract_value_num (number): value in INR (1 lakh=100000, 1 crore=10000000)
- unit_price (number): per-unit price in INR
- quantity (number): units ordered
- contract_date (ISO string): date of contract
- contract_year (number): 2019–2025
- buying_mode (string): e.g. "GeM Pool", "Direct Purchase"
- is_100x (boolean): true if 100X Circle contract
- has_unit_price (boolean): true if unit price available

### "sellers" — dealer/distributor/seller queries
Fields available in fogging_sellers:
- seller_display_name (string): dealer/company name
- seller_state (string): state of operation
- total_gmv (number): total GMV in INR
- oem_count (number): number of distinct OEM brands carried
- buyers_served (number): unique buyers served
- is_100x_dealer (boolean): true if carries 100X Circle
- carries_neptune (boolean)
- carries_sse (boolean)
- carries_instafog (boolean)
- carries_pulsfog (boolean)
- seller_gst (string): GSTIN
- has_gst (boolean): has valid GST registration
- seller_msme (string): social category (General/OBC/SC/ST)

## OUTPUT FORMAT

Always return a single JSON object with exactly these keys:
- "query_type": "contracts" or "sellers"
- "filter": MongoDB filter object for the appropriate collection
- "explanation": one sentence describing what was filtered
- "sort": optional sort field and direction e.g. {"oem_count": -1}

## RULES
1. Use $regex with $options:"i" for text name searches
2. Use $gte/$lte for number ranges
3. For OEM canonicals use UPPERCASE exact keys
4. "dealers", "distributors", "sellers", "who sells", "which companies sell" → query_type: sellers
5. "contracts", "purchases", "orders", "OEM sold", "bought by" → query_type: contracts
6. For ambiguous queries about OEM brands: prefer contracts
7. For "multiple OEMs" / "multi-OEM" → oem_count: {$gt:1}

## EXAMPLES

Q: "find dealers who sell multiple OEMs"
A: {"query_type":"sellers","filter":{"oem_count":{"$gt":1}},"sort":{"oem_count":-1},"explanation":"Dealers who carry more than one OEM brand, ranked by OEM count."}

Q: "show Neptune dealers in UP"
A: {"query_type":"sellers","filter":{"carries_neptune":true,"seller_state":"Uttar Pradesh"},"sort":{"total_gmv":-1},"explanation":"Neptune dealers operating in Uttar Pradesh."}

Q: "who are the top dealers in Bihar"
A: {"query_type":"sellers","filter":{"seller_state":"Bihar"},"sort":{"total_gmv":-1},"explanation":"Dealers operating in Bihar by total GMV."}

Q: "dealers not carrying 100X"
A: {"query_type":"sellers","filter":{"is_100x_dealer":false},"sort":{"total_gmv":-1},"explanation":"Dealers who do not currently carry 100X Circle."}

Q: "Show all Neptune contracts in Bihar"
A: {"query_type":"contracts","filter":{"oem_canonical":"NEPTUNE","buyer_state":"Bihar"},"explanation":"All Neptune contracts where the buyer is in Bihar."}

Q: "Show all Royal Tradelinks sales"
A: {"query_type":"contracts","filter":{"seller_name":{"$regex":"Royal Tradelinks","$options":"i"}},"explanation":"All contracts sold by Royal Tradelinks."}

Q: "Show all contracts above 10 lakh"
A: {"query_type":"contracts","filter":{"contract_value_num":{"$gte":1000000}},"explanation":"All contracts with value above ₹10 lakh."}

Q: "Show 100X contracts in UP"
A: {"query_type":"contracts","filter":{"is_100x":true,"buyer_state":"Uttar Pradesh"},"explanation":"100X Circle contracts in Uttar Pradesh."}`;

interface SellerDoc {
  seller_slug?: string; seller_gst?: string | null; seller_display_name?: string;
  seller_state?: string; total_gmv?: number | null; oem_count?: number | null;
  buyers_served?: number | null; is_100x_dealer?: boolean;
  oems_represented?: { oem_canonical: string; brand_name: string; gmv: number }[];
}

export async function POST(req: NextRequest) {
  try {
    const body  = await req.json() as { query?: string };
    const query = (body.query ?? '').trim();

    if (!query || query.length < 3)  return NextResponse.json({ error: 'Query too short' },  { status: 400 });
    if (query.length > 500)          return NextResponse.json({ error: 'Query too long' },   { status: 400 });

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) return NextResponse.json({ error: 'AI not configured' }, { status: 503 });

    const anthropic = new Anthropic({ apiKey: anthropicKey });

    const msg = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: query }],
    });

    const raw = (msg.content[0] as { type: string; text: string }).text?.trim() ?? '';

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: 'Could not parse query', raw }, { status: 422 });

    let parsed: { query_type?: string; filter?: Record<string, unknown>; explanation?: string; sort?: Record<string, unknown> };
    try {
      parsed = JSON.parse(jsonMatch[0]) as typeof parsed;
    } catch {
      return NextResponse.json({ error: 'Invalid filter JSON', raw }, { status: 422 });
    }

    const queryType  = parsed.query_type ?? 'contracts';
    const filter     = parsed.filter ?? {};
    const sortSpec   = (parsed.sort ?? {}) as Record<string, 1 | -1>;
    const explanation = parsed.explanation ?? query;

    const client = await clientPromise;
    const db     = client.db(DB);

    // ── Seller query ──────────────────────────────────────────────────────────
    if (queryType === 'sellers') {
      const defaultSort: Record<string, 1 | -1> = Object.keys(sortSpec).length
        ? (sortSpec as Record<string, 1 | -1>)
        : { total_gmv: -1 };

      const [docs, total] = await Promise.all([
        db.collection('fogging_sellers').find(filter, {
          projection: {
            seller_slug: 1, seller_gst: 1, seller_display_name: 1,
            seller_state: 1, total_gmv: 1, oem_count: 1, buyers_served: 1,
            is_100x_dealer: 1, oems_represented: 1,
          },
        }).sort(defaultSort).limit(100).toArray() as Promise<SellerDoc[]>,
        db.collection('fogging_sellers').countDocuments(filter),
      ]);

      const summaryArr = await db.collection('fogging_sellers').aggregate([
        { $match: filter },
        { $group: { _id: null, total_gmv: { $sum: '$total_gmv' }, states: { $addToSet: '$seller_state' } } },
      ]).toArray();
      const s = summaryArr[0] ?? {};

      return NextResponse.json({
        query, explanation, filter, total,
        collection: 'sellers',
        data: docs,
        summary: {
          total_gmv:   s.total_gmv ?? 0,
          state_count: (s.states ?? []).length,
        },
      });
    }

    // ── Contract query (default) ───────────────────────────────────────────────
    const defaultSort: Record<string, 1 | -1> = Object.keys(sortSpec).length
      ? (sortSpec as Record<string, 1 | -1>)
      : { contract_date: -1 };

    const [docs, total] = await Promise.all([
      db.collection('fogging_contracts').find(filter, {
        projection: {
          gemc_no: 1, contract_date: 1,
          buyer_display_name: 1, buyer_canonical: 1, buyer_state: 1, org_type: 1,
          oem_canonical: 1, oem_short_brand: 1, is_100x: 1,
          model_raw: 1,
          contract_value_num: 1, quantity: 1, unit_price: 1,
          seller_name: 1, seller_gst: 1,
          buying_mode: 1,
        },
      }).sort(defaultSort).limit(200).toArray(),
      db.collection('fogging_contracts').countDocuments(filter),
    ]);

    const summaryArr = await db.collection('fogging_contracts').aggregate([
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
      query, explanation, filter, total,
      collection: 'contracts',
      data: docs,
      summary: {
        total_gmv:   s.total_gmv ?? 0,
        buyer_count: (s.buyers ?? []).length,
        oem_count:   (s.oems   ?? []).length,
        state_count: (s.states ?? []).length,
      },
    });
  } catch (e) {
    console.error('[fogging/copilot]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
