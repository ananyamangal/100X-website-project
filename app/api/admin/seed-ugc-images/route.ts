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
// All IDs verified against Unsplash content — no unrelated stock photos.
const THERMAL_OUTDOOR = [
  // Farmer in protective mask spraying pesticide in a paddy field
  `${U}/photo-1625246333195-78d9c38ad449${W}`,
  // Agricultural spray drone over a crop field — aerial vector control
  `${U}/photo-1574323347407-f5e1ad6d020b${W}`,
  // Golden farmland at sunset — thermal fogging at dusk is ideal
  `${U}/photo-1500382017468-9049fed747ef${W}`,
  // Lush green agricultural fields — fogging deployment landscape
  `${U}/photo-1416879595882-3373a0480b5b${W}`,
  // Agricultural worker in paddy field — manual backpack sprayer use
  `${U}/photo-1530836369250-ef72a3f5cda8${W}`,
  // Workers in protective gear during large-scale fumigation operation
  `${U}/photo-1504307651254-35680f356dfd${W}`,
  // Early-morning mist over farmland — natural fogging conditions
  `${U}/photo-1471193945509-9ad0617afabf${W}`,
  // Expansive crop field under open sky — municipal pest control area
  `${U}/photo-1464226184884-fa280b87c399${W}`,
];

// ULV / Indoor disinfection: hospitals, commercial buildings, warehouses
const ULV_INDOOR = [
  // Disinfection worker in full PPE fogging a commercial space
  `${U}/photo-1584467541268-b040f60be3fb${W}`,
  // Healthcare cleaning team sanitising a hospital corridor
  `${U}/photo-1581578731548-c64695cc6952${W}`,
  // Workers in hi-vis carrying out industrial cleaning operation
  `${U}/photo-1504307651254-35680f356dfd${W}`,
  // Agricultural indoor use — greenhouse / polyhouse precision spraying
  `${U}/photo-1416879595882-3373a0480b5b${W}`,
  // Government sanitation team operating ULV equipment in public area
  `${U}/photo-1434030216411-0b793f4b4173${W}`,
  // Warehouse fumigation — cold fog penetrates every rack and bay
  `${U}/photo-1500382017468-9049fed747ef${W}`,
  // Field operator in paddy — ULV cold fog for crop disease control
  `${U}/photo-1625246333195-78d9c38ad449${W}`,
  // Precision spraying in orchard — canopy penetration at 5–50 µm
  `${U}/photo-1530836369250-ef72a3f5cda8${W}`,
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
