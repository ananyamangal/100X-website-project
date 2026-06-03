/**
 * rebrand-diagram.mjs
 * Rebrands the BF-150/200 spare parts exploded diagram (1024×652)
 *
 * Strategy:
 *   1. White-fill the teal Bestfogger strip (y:0-13, full width)
 *   2. Expand to a proper 50px branded header using sharp extend
 *   3. Add 100X logo (left) + "BF-150 / BF-200 Spare Parts — Exploded Diagram" (right)
 *   4. Cover the "Bestfogger" text cluster (x:745-925, y:55-75 in original)
 *      with white + "100X Circle" text badge
 *   5. Upload to Cloudinary, update MongoDB
 */
import sharp from '../node_modules/sharp/lib/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import https from 'https';
import { MongoClient } from '../node_modules/mongodb/lib/index.js';

const ROOT    = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TMP     = path.join(ROOT, '.rebrand-tmp');
const OUT     = path.join(ROOT, '.rebrand-out-final');
const LOGO    = path.join(ROOT, 'public', 'logo-main.png');
const CLOUD   = 'dhbvzugv6';
const PRESET  = 'product_uploads';
const FOLDER  = '100x-final';
const SRC     = path.join(TMP, 'exploded-diagram.png');
const DEST    = path.join(OUT, 'exploded-diagram-100x.png');

// Original image: 1024×652
// teal strip: y:0-13 full width
// Bestfogger text cluster: x:745-925, y:52-72 (in original)

const ORIG_W = 1024;
const ORIG_H = 652;
const HDR_H  = 46;  // new branded header height (replaces the teal 14px strip + adds space)

function readMongoUri() {
  for (const f of ['.env.local', '.env']) {
    try { const c = fs.readFileSync(path.join(ROOT, f), 'utf8'); const m = c.match(/^MONGODB_URI=(.+)$/m); if (m) return m[1].trim(); } catch {}
  }
  throw new Error('MONGODB_URI not found');
}

async function upload(filePath, publicId) {
  const buf = fs.readFileSync(filePath);
  const B   = `Bound${Date.now()}`;
  const add = (n, v) => `--${B}\r\nContent-Disposition: form-data; name="${n}"\r\n\r\n${v}\r\n`;
  const body = Buffer.concat([
    Buffer.from([add('upload_preset', PRESET), add('folder', FOLDER), add('public_id', publicId)].join('')),
    Buffer.from(`--${B}\r\nContent-Disposition: form-data; name="file"; filename="f.png"\r\nContent-Type: image/png\r\n\r\n`),
    buf,
    Buffer.from(`\r\n--${B}--\r\n`),
  ]);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.cloudinary.com', path: `/v1_1/${CLOUD}/image/upload`, method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${B}`, 'Content-Length': body.length },
    }, res => {
      const c = []; res.on('data', d => c.push(d));
      res.on('end', () => { const j = JSON.parse(Buffer.concat(c).toString()); j.error ? reject(new Error(j.error.message)) : resolve(j); });
    });
    req.on('error', reject); req.write(body); req.end();
  });
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  100X Circle — Diagram Rebrand               ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // ── 1. Load logo and scale for header ──────────────────────────────────────
  const LOGO_H   = HDR_H - 10;   // 36px tall within 46px header
  const LOGO_MAXW = 180;
  const logoBuf  = await sharp(LOGO)
    .resize(LOGO_MAXW, LOGO_H, { fit: 'inside', background: { r:255,g:255,b:255,alpha:1 } })
    .png().toBuffer();
  const lMeta    = await sharp(logoBuf).metadata();

  // ── 2. Build the new header (1024 × HDR_H) ────────────────────────────────
  //    White background | 100X logo left | title text right
  const titleSvg = Buffer.from(
    `<svg width="${ORIG_W}" height="${HDR_H}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${ORIG_W}" height="${HDR_H}" fill="white"/>
      <!-- Left red accent strip -->
      <rect x="0" y="0" width="5" height="${HDR_H}" fill="#dc2626"/>
      <!-- Title text -->
      <text x="${lMeta.width + 22}" y="${Math.round(HDR_H * 0.58)}"
        font-family="Arial,sans-serif" font-weight="700" font-size="15" fill="#0f172a"
      >BF-150 / BF-200 Spare Parts — Exploded Diagram</text>
      <!-- Right: 100X Circle label -->
      <text x="${ORIG_W - 12}" y="${Math.round(HDR_H * 0.58)}"
        text-anchor="end" font-family="Arial,sans-serif" font-weight="700" font-size="12" fill="#6b7280"
      >100X Circle</text>
      <!-- Bottom border line -->
      <rect x="0" y="${HDR_H - 1}" width="${ORIG_W}" height="1" fill="#e2e8f0"/>
    </svg>`
  );

  const header = await sharp({
    create: { width: ORIG_W, height: HDR_H, channels: 4, background: { r:255, g:255, b:255, alpha:1 } },
  })
  .composite([
    { input: titleSvg, left: 0, top: 0 },
    { input: logoBuf, left: 8, top: Math.floor((HDR_H - lMeta.height) / 2) },
  ])
  .png().toBuffer();

  // ── 3. Process the original diagram ───────────────────────────────────────
  //    a. White-fill the teal strip (y:0-13 in original)
  //    b. White-fill + "100X Circle" badge over Bestfogger text cluster (x:742-930, y:50-75)
  const tealFill = Buffer.from(
    `<svg width="${ORIG_W}" height="14" xmlns="http://www.w3.org/2000/svg">
      <rect width="${ORIG_W}" height="14" fill="white"/></svg>`
  );

  // The Bestfogger text in the diagram legend at x:742-930, y:50-75
  const BF_X = 742, BF_Y = 48, BF_W = 196, BF_H = 30;
  const bfFill = Buffer.from(
    `<svg width="${BF_W}" height="${BF_H}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${BF_W}" height="${BF_H}" fill="white"/>
      <rect x="0" y="0" width="3" height="${BF_H}" fill="#dc2626"/>
      <text x="10" y="${Math.round(BF_H * 0.65)}"
        font-family="Arial,sans-serif" font-weight="700" font-size="11" fill="#0f172a"
      >100X Circle</text>
    </svg>`
  );

  const processedDiagram = await sharp(SRC)
    .composite([
      { input: tealFill, left: 0, top: 0 },
      { input: bfFill,   left: BF_X, top: BF_Y },
    ])
    .png().toBuffer();

  // ── 4. Stack: new header on top + processed diagram below ─────────────────
  const totalH = HDR_H + ORIG_H;
  await sharp({
    create: { width: ORIG_W, height: totalH, channels: 4, background: { r:255, g:255, b:255, alpha:1 } },
  })
  .composite([
    { input: header,           left: 0, top: 0 },
    { input: processedDiagram, left: 0, top: HDR_H },
  ])
  .png({ compressionLevel: 8 })
  .toFile(DEST);

  console.log(`✓ Processed: ${DEST}`);
  console.log(`  Output size: ${ORIG_W}×${totalH}px\n`);

  // ── 5. Upload to Cloudinary ────────────────────────────────────────────────
  console.log('Uploading to Cloudinary...');
  const res = await upload(DEST, 'diagram-bf150-bf200-exploded');
  const url = res.secure_url;
  console.log(`✓ Uploaded: ${url}\n`);

  // ── 6. Update MongoDB spare_parts for the exploded diagram entry ───────────
  console.log('Updating MongoDB...');
  const client = new MongoClient(readMongoUri());
  await client.connect();
  const db = client.db('100xDB');
  const parts = db.collection('spare_parts');

  const diagramPart = await parts.findOne({ sku: '100X-SP-DIAGRAM-150-200' });
  if (diagramPart) {
    await parts.updateOne(
      { sku: '100X-SP-DIAGRAM-150-200' },
      { $set: { images: [url], updatedAt: new Date().toISOString() } }
    );
    console.log('✓ Updated spare_parts: BF-150/200 Exploded Parts Diagram');
  } else {
    // Try matching by image URL pattern
    const result = await parts.updateMany(
      { images: { $elemMatch: { $regex: 'อะไหล่' } } },
      { $set: { images: [url], updatedAt: new Date().toISOString() } }
    );
    console.log(`✓ Updated ${result.modifiedCount} diagram spare parts`);
  }

  await client.close();
  console.log('\n=== Done ===\n');
  console.log('New diagram URL:', url);
}

main().catch(e => { console.error(e); process.exit(1); });
