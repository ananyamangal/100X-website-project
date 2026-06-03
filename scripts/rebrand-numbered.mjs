/**
 * rebrand-numbered.mjs
 * Processes the 8 numbered spare part images (57,61-65,67,68.jpg)
 * that were previously given only a corner watermark.
 * All are 300×300 Best Fogger catalog cards — apply full buildSpareCard.
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
const VENDOR  = 'https://www.bestfoggerthailand.com/wp-content/uploads/2025/08';

// Same card layout constants as rebrand-final.mjs
const CARD_W      = 300;
const HDR_H       = 72;
const PHOTO_H     = 190;
const FTR_H       = CARD_W - HDR_H - PHOTO_H;   // 38
const SRC_TOP     = 113;
const SRC_BOT     = 265;
const SRC_PHOTO_H = SRC_BOT - SRC_TOP;           // 152

// SKU lookup so we can update the right MongoDB document
const FILE_TO_SKU = {
  '57.jpg':  '100X-SP-LANCE-A',
  '61.jpg':  '100X-SP-TUBE-150-1',
  '62.jpg':  '100X-SP-TUBE-200-1',
  '63.jpg':  '100X-SP-TUBE-SEC3',
  '64.jpg':  '100X-SP-TUBE-SEC4',
  '65.jpg':  '100X-SP-PIPE-CHAMBER-EXT',
  '67.jpg':  '100X-SP-SILENCER-AIR',
  '68.jpg':  '100X-SP-PLUG-DRAIN',
};

const FILES = Object.keys(FILE_TO_SKU);

function readMongoUri() {
  for (const f of ['.env.local', '.env']) {
    try { const c = fs.readFileSync(path.join(ROOT, f), 'utf8'); const m = c.match(/^MONGODB_URI=(.+)$/m); if (m) return m[1].trim(); } catch {}
  }
  throw new Error('MONGODB_URI not found');
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, r => {
      if (r.statusCode !== 200) return reject(new Error(`HTTP ${r.statusCode}: ${url}`));
      const c = []; r.on('data', d => c.push(d)); r.on('end', () => resolve(Buffer.concat(c)));
      r.on('error', reject);
    }).on('error', reject);
  });
}

async function downloadIfMissing(file) {
  const dest = path.join(TMP, file);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 500) return dest;
  const enc = file.split('').map(c => encodeURIComponent(c)).join('');
  const buf = await fetchBuffer(`${VENDOR}/${enc}`).catch(() => null);
  if (!buf) return null;
  fs.writeFileSync(dest, buf);
  return dest;
}

async function upload(filePath, publicId) {
  const buf  = fs.readFileSync(filePath);
  const ext  = path.extname(filePath).slice(1) || 'jpg';
  const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
  const B    = `Bound${Date.now()}`;
  const add  = (n, v) => `--${B}\r\nContent-Disposition: form-data; name="${n}"\r\n\r\n${v}\r\n`;
  const body = Buffer.concat([
    Buffer.from([add('upload_preset', PRESET), add('folder', FOLDER), add('public_id', publicId)].join('')),
    Buffer.from(`--${B}\r\nContent-Disposition: form-data; name="file"; filename="f.jpg"\r\nContent-Type: ${mime}\r\n\r\n`),
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
  return sharp(LOGO).resize(maxW, maxH, { fit: 'inside', background: { r:255, g:255, b:255, alpha:1 } }).png().toBuffer();
}

async function buildSpareCard(srcPath, outPath) {
  const logoMax = { w: 210, h: HDR_H - 16 };
  const logoBuf = await scaledLogo(logoMax.w, logoMax.h);
  const lMeta   = await sharp(logoBuf).metadata();
  const lx = Math.floor((CARD_W - lMeta.width)  / 2);
  const ly = Math.floor((HDR_H  - lMeta.height) / 2);

  const header = await sharp({
    create: { width: CARD_W, height: HDR_H, channels: 4, background: { r:255, g:255, b:255, alpha:1 } },
  })
  .composite([{ input: logoBuf, left: lx, top: ly }])
  .png().toBuffer();

  // Korean flag patch — x:228-294, y:0-40 of scaled photo
  const flagPatch = Buffer.from(
    `<svg width="66" height="40" xmlns="http://www.w3.org/2000/svg"><rect width="66" height="40" fill="white"/></svg>`
  );

  const rawPhoto = await sharp(srcPath)
    .extract({ left: 0, top: SRC_TOP, width: CARD_W, height: SRC_PHOTO_H })
    .resize(CARD_W, PHOTO_H, { fit: 'fill' })
    .composite([{ input: flagPatch, left: 228, top: 0 }])
    .toBuffer();

  const footer = await sharp({
    create: { width: CARD_W, height: FTR_H, channels: 4, background: { r:15, g:23, b:42, alpha:1 } },
  })
  .composite([{
    input: Buffer.from(
      `<svg width="${CARD_W}" height="${FTR_H}" xmlns="http://www.w3.org/2000/svg">` +
      `<text x="14" y="${Math.round(FTR_H*0.65)}" font-family="Arial,sans-serif" font-weight="700" font-size="12" fill="#ffffff">100X Circle</text>` +
      `<text x="105" y="${Math.round(FTR_H*0.65)}" font-family="Arial,sans-serif" font-weight="400" font-size="10" fill="#64748b">  Genuine Fogging Equipment Parts</text>` +
      `</svg>`
    ), left: 0, top: 0,
  }])
  .png().toBuffer();

  await sharp({
    create: { width: CARD_W, height: CARD_W, channels: 4, background: { r:255, g:255, b:255, alpha:1 } },
  })
  .composite([
    { input: header,   left: 0, top: 0 },
    { input: rawPhoto, left: 0, top: HDR_H },
    { input: footer,   left: 0, top: HDR_H + PHOTO_H },
    { input: Buffer.from(`<svg width="${CARD_W}" height="1" xmlns="http://www.w3.org/2000/svg"><rect width="${CARD_W}" height="1" fill="#e2e8f0"/></svg>`), left:0, top:HDR_H },
    { input: Buffer.from(`<svg width="${CARD_W}" height="1" xmlns="http://www.w3.org/2000/svg"><rect width="${CARD_W}" height="1" fill="#1e293b"/></svg>`), left:0, top:HDR_H+PHOTO_H },
  ])
  .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
  .toFile(outPath);
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  Rebrand — 8 Numbered Spare Part Images      ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  const urlMap = {};

  for (const file of FILES) {
    const src = await downloadIfMissing(file);
    if (!src) { console.log(`  ✗ download failed: ${file}`); continue; }

    const outPath = path.join(OUT, file);
    const slug    = 'f-' + Buffer.from(file).toString('base64').replace(/[^a-zA-Z0-9]/g,'').slice(0,55);

    try {
      await buildSpareCard(src, outPath);
      const res = await upload(outPath, slug);
      urlMap[file] = res.secure_url;
      console.log(`  ✓ ${file.padEnd(10)} SKU: ${FILE_TO_SKU[file].padEnd(28)} → uploaded`);
    } catch (e) {
      console.log(`  ✗ ${file}: ${e.message}`);
    }
  }

  // Update MongoDB spare_parts by SKU
  console.log('\n=== Updating MongoDB ===\n');
  const client = new MongoClient(readMongoUri());
  await client.connect();
  const db = client.db('100xDB');
  const parts = db.collection('spare_parts');

  for (const [file, newUrl] of Object.entries(urlMap)) {
    const sku = FILE_TO_SKU[file];
    const result = await parts.updateOne(
      { sku },
      { $set: { images: [newUrl], updatedAt: new Date().toISOString() } }
    );
    if (result.matchedCount > 0) {
      console.log(`  ✓ ${sku}`);
    } else {
      // fallback: match by any image containing the old file
      const oldPattern = new RegExp(file.replace('.', '\\.'));
      const r2 = await parts.updateMany(
        { images: { $elemMatch: { $regex: oldPattern } } },
        { $set: { images: [newUrl], updatedAt: new Date().toISOString() } }
      );
      console.log(`  ✓ ${sku} (fallback: ${r2.modifiedCount} updated)`);
    }
  }

  await client.close();
  console.log('\n=== Done ===\n');
}

main().catch(e => { console.error(e); process.exit(1); });
