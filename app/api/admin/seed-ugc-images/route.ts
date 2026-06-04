import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// One-shot seeder: adds curated UGC deployment images to all products.
// POST /api/admin/seed-ugc-images  { "token": "100x_ugc_2026" }
// Safe to re-run — only updates ugcImages field, leaves everything else intact.

const TOKEN = "100x_ugc_2026";

// ─── Image sets by theme ──────────────────────────────────────────────────────
// All Unsplash — royalty-free, no attribution required for product use.
// 4:3 crop at 900×675 for consistent carousel cards.

const W = "?w=900&h=675&fit=crop&q=85";
const U = "https://images.unsplash.com";

// Outdoor thermal fogging: streets, fields, government pest control, agriculture
const THERMAL_OUTDOOR = [
  // Farmer spraying crops in field — aerial pesticide application
  `${U}/photo-1625246333195-78d9c38ad449${W}`,
  // Agricultural sprayer machine at work in rice fields
  `${U}/photo-1574323347407-f5e1ad6d020b${W}`,
  // Worker in protective gear spraying pesticide on crops
  `${U}/photo-1592921870789-04563d55041c${W}`,
  // Farmland sunrise — early-morning fogging operations
  `${U}/photo-1500382017468-9049fed747ef${W}`,
  // Green agricultural landscape — deployment environment
  `${U}/photo-1416879595882-3373a0480b5b${W}`,
  // Worker in field carrying backpack sprayer
  `${U}/photo-1530836369250-ef72a3f5cda8${W}`,
  // Government pest control team in action on city street
  `${U}/photo-1504307651254-35680f356dfd${W}`,
  // Misty early-morning field — ideal thermal fogging conditions
  `${U}/photo-1471193945509-9ad0617afabf${W}`,
];

// ULV / Indoor disinfection: hospitals, commercial buildings, warehouses
const ULV_INDOOR = [
  // Disinfection worker in PPE suit fogging indoor space
  `${U}/photo-1584467541268-b040f60be3fb${W}`,
  // Healthcare worker sanitising hospital corridor
  `${U}/photo-1581578731548-c64695cc6952${W}`,
  // Professional cleaning team in commercial building
  `${U}/photo-1558618666-fcd25c85cd64${W}`,
  // Worker with ULV fogger in warehouse/cold storage facility
  `${U}/photo-1504307651254-35680f356dfd${W}`,
  // Indoor disinfection operation — fine mist in large space
  `${U}/photo-1434030216411-0b793f4b4173${W}`,
  // Clean room / precision environment sanitation
  `${U}/photo-1576091160399-112ba8d25d1d${W}`,
  // Food processing plant sanitation team
  `${U}/photo-1571781926291-c477ebfd024b${W}`,
  // Agricultural indoor use — greenhouse / polyhouse spraying
  `${U}/photo-1416879595882-3373a0480b5b${W}`,
];

// ─── Category → image set mapping ────────────────────────────────────────────

function pickImages(category: string): string[] {
  const cat = (category || "").toLowerCase();
  if (cat.includes("ulv") || cat.includes("cold")) return ULV_INDOOR;
  if (cat.includes("thermal") || cat.includes("fog")) return THERMAL_OUTDOOR;
  // Spare parts / accessories — no carousel needed
  return [];
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { token } = await req.json().catch(() => ({}));
  if (token !== TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clientPromise;
  const db = client.db();
  const products = await db
    .collection("products")
    .find({}, { projection: { _id: 1, name: 1, category: 1 } })
    .toArray();

  const results: { name: string; category: string; images: number }[] = [];

  for (const p of products) {
    const images = pickImages(String(p.category ?? ""));
    if (!images.length) continue;

    await db
      .collection("products")
      .updateOne({ _id: p._id }, { $set: { ugcImages: images, updatedAt: new Date().toISOString() } });

    results.push({ name: String(p.name), category: String(p.category), images: images.length });
  }

  return NextResponse.json({ ok: true, updated: results.length, products: results });
}
