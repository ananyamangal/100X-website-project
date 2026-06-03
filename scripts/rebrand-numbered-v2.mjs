/**
 * rebrand-numbered-v2.mjs
 * Fixed version — uses 'fc-' prefix to get unique Cloudinary public IDs
 * so the full-rebuild images actually replace the old corner-watermark ones.
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

const CARD_W      = 300;
const HDR_H       = 72;
const PHOTO_H     = 190;
const FTR_H       = CARD_W - HDR_H - PHOTO_H;
const SRC_TOP     = 113;
const SRC_BOT     = 265;
const SRC_PHOTO_H = SRC_BOT - SRC_TOP;

const FILE_TO_SKU = {
  '57.jpg': '100X-SP-LANCE-A',
  '61.jpg': '100X-SP-TUBE-150-1',
  '62.jpg': '100X-SP-TUBE-200-1',
  '63.jpg': '100X-SP-TUBE-SEC3',
  '64.jpg': '100X-SP-TUBE-SEC4',
  '65.jpg': '100X-SP-PIPE-CHAMBER-EXT',
  '67.jpg': '100X-SP-SILENCER-AIR',
  '68.jpg': '100X-SP-PLUG-DRAIN',
};

function readMongoUri() {
  for (const f of ['.env.local', '.env']) {
    try { const c = fs.readFileSync(path.join(ROOT, f), 'utf8'); const m = c.match(/^MONGODB_URI=(.+)$/m); if (m) return m[1].trim(); } catch {}
  }
  throw new Error('MONGODB_URI not found');
}

async function upload(filePath, publicId) {
  const buf  = fs.readFileSync(filePath);
  const mime = 'image/jpeg';
  const B    = `Bound${Date.now()}${Math.random().toString(36).slice(2)}`;
  const add  = (n, v) => `--${B}\r\nContent-Disposition: form-data; name="${n}"\r\n\r\n${v}\r\n`;
  const body = Buffer.concat([
    Buffer.from([add('upload_preset', PRESET), add('folder', FOLDER), add('public_id', publicId)].join('')),
    Buffer.from(`--${B}\r\nContent-Disposition: form-data; name="file"; filename="img.jpg"\r\nContent-Type: ${mime}\r\n\r\n`),
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

async function scaledLogo(maxW, maxH) {
  return sharp(LOGO).resize(maxW, maxH, { fit: 'inside', background: { r:255,g:255,b:255,alpha:1 } }).png().toBuffer();
}

async function buildSpareCard(srcPath, outPath) {
  const logoBuf = await scaledLogo(210, HDR_H - 16);
  const lMeta   = await sharp(logoBuf).metadata();

  const header = await sharp({
    create: { width: CARD_W, height: HDR_H, channels: 4, background: { r:255,g:255,b:255,alpha:1 } },
  })
  .composite([{ input: logoBuf, left: Math.floor((CARD_W-lMeta.width)/2), top: Math.floor((HDR_H-lMeta.height)/2) }])
  .png().toBuffer();

  // Cover Korean flag at top-right of photo
  const flagPatch = Buffer.from(
    `<svg width="72" height="44" xmlns="http://www.w3.org/2000/svg"><rect width="72" height="44" fill="white"/></svg>`
  );

  const photo = await sharp(srcPath)
    .extract({ left: 0, top: SRC_TOP, width: CARD_W, height: SRC_PHOTO_H })
    .resize(CARD_W, PHOTO_H, { fit: 'fill' })
    .composite([{ input: flagPatch, left: 224, top: 0 }])
    .toBuffer();

  const footer = await sharp({
    create: { width: CARD_W, height: FTR_H, channels: 4, background: { r:15,g:23,b:42,alpha:1 } },
  })
  .composite([{
    input: Buffer.from(
      `<svg width="${CARD_W}" height="${FTR_H}" xmlns="http://www.w3.org/2000/svg">` +
      `<text x="14" y="${Math.round(FTR_H*0.65)}" font-family="Arial,sans-serif" font-weight="700" font-size="12" fill="#ffffff">100X Circle</text>` +
      `<text x="105" y="${Math.round(FTR_H*0.65)}" font-family="Arial,sans-serif" font-weight="400" font-size="10" fill="#64748b">  Genuine Fogging Equipment Parts</text>` +
      `</svg>`
    ), left: 0, top: 0,
  }]).png().toBuffer();

  await sharp({
    create: { width: CARD_W, height: CARD_W, channels: 4, background: { r:255,g:255,b:255,alpha:1 } },
  })
  .composite([
    { input: header, left:0, top:0 },
    { input: photo,  left:0, top:HDR_H },
    { input: footer, left:0, top:HDR_H+PHOTO_H },
    { input: Buffer.from(`<svg width="${CARD_W}" height="1" xmlns="http://www.w3.org/2000/svg"><rect width="${CARD_W}" height="1" fill="#e2e8f0"/></svg>`), left:0, top:HDR_H },
    { input: Buffer.from(`<svg width="${CARD_W}" height="1" xmlns="http://www.w3.org/2000/svg"><rect width="${CARD_W}" height="1" fill="#1e293b"/></svg>`), left:0, top:HDR_H+PHOTO_H },
  ])
  .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
  .toFile(outPath);
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  Rebrand Numbered Parts v2 (unique IDs)      ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  const client = new MongoClient(readMongoUri());
  await client.connect();
  const db = client.db('100xDB');

  for (const [file, sku] of Object.entries(FILE_TO_SKU)) {
    const srcPath = path.join(TMP, file);
    const outPath = path.join(OUT, 'nb-' + file);

    if (!fs.existsSync(srcPath)) {
      console.log(`  ✗ Missing source: ${file}`);
      continue;
    }

    try {
      // Build the full rebranded card
      await buildSpareCard(srcPath, outPath);

      // Use 'fc-' prefix (fresh-card) so Cloudinary treats as NEW asset
      const publicId = 'fc-' + file.replace('.jpg','').replace('.png','');
      const res = await upload(outPath, publicId);
      const url = res.secure_url;

      // Update MongoDB by SKU
      await db.collection('spare_parts').updateOne(
        { sku },
        { $set: { images: [url], updatedAt: new Date().toISOString() } }
      );

      console.log(`  ✓ ${file.padEnd(10)} ${sku.padEnd(32)} → ${url.split('/').pop()}`);
    } catch (e) {
      console.log(`  ✗ ${file} (${sku}): ${e.message}`);
    }
  }

  await client.close();
  console.log('\n=== Done ===\n');
}

main().catch(e => { console.error(e); process.exit(1); });
