/**
 * rebrand-final.mjs — 100X Circle — definitive image rebranding
 *
 * STRATEGY:
 *   Spare parts (300×300 cards):
 *     • Discard EVERYTHING above the clean product photo (entire template zone)
 *     • Extract only the pure product photo (y:113–265, 152px)
 *     • Build a clean 100X Circle card around it:
 *         Header 72px  : white bg + large centred 100X logo
 *         Photo  190px : product photo (scaled from 152→190px)
 *         Footer  38px : dark "#0f172a" + "100X Circle" in white
 *     • No Korean OEM. No QR. No Thai. No flag.
 *
 *   Product machines (various sizes):
 *     • Body-colour fill over "Best Fogger" sticker
 *     • Actual logo-main.png as a clean white label badge
 *     • Better sizing: sticker width = 65% of original sticker width,
 *       so the logo is large and readable, not squeezed
 *
 * Run: node scripts/rebrand-final.mjs
 */

import sharp from '../node_modules/sharp/lib/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import https from 'https';

const ROOT     = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TMP      = path.join(ROOT, '.rebrand-tmp');
const OUT      = path.join(ROOT, '.rebrand-out-final');
const LOGO     = path.join(ROOT, 'public', 'logo-main.png');
const VENDOR   = 'https://www.bestfoggerthailand.com/wp-content/uploads/2025/08';
const CLOUD    = 'dhbvzugv6';
const PRESET   = 'product_uploads';
const FOLDER   = '100x-final';

[TMP, OUT].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d); });

// ── fetch / upload helpers ────────────────────────────────────────────────────
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

// ── logo helper ───────────────────────────────────────────────────────────────
async function scaledLogo(maxW, maxH) {
  return sharp(LOGO).resize(maxW, maxH, { fit: 'inside', background: { r:255,g:255,b:255,alpha:1 } }).png().toBuffer();
}

// ── SPARE PARTS: complete rebuild ─────────────────────────────────────────────
// Card layout (300×300):
//   Header  0–72   : white bg + centred 100X logo
//   Photo  72–262  : product photo only (scaled from 152→190px)
//   Footer 262–300 : dark bg + "100X Circle"

const CARD_W     = 300;
const HDR_H      = 72;
const PHOTO_H    = 190;   // final photo height in the card
const FTR_H      = CARD_W - HDR_H - PHOTO_H;  // 38
const SRC_TOP    = 113;   // where the clean product photo starts in original
const SRC_BOT    = 265;   // where the orange banner starts in original
const SRC_PHOTO_H = SRC_BOT - SRC_TOP; // 152px

async function buildSpareCard(srcPath, outPath, physicalSticker = null) {
  // 1. Build header buffer
  const logoMax = { w: 210, h: HDR_H - 16 };  // 210×56
  const logoBuf = await scaledLogo(logoMax.w, logoMax.h);
  const lMeta   = await sharp(logoBuf).metadata();
  const lx = Math.floor((CARD_W - lMeta.width)  / 2);
  const ly = Math.floor((HDR_H  - lMeta.height) / 2);

  const header = await sharp({
    create: { width: CARD_W, height: HDR_H, channels: 4, background: { r:255, g:255, b:255, alpha:1 } },
  })
  .composite([{ input: logoBuf, left: lx, top: ly }])
  .png().toBuffer();

  // 2. Extract product photo from original, scale, then patch out Korean flag
  // Korean flag in original: x:230-278, y:104-138
  // After extraction from y:113 → relative y:104-113=-9(clipped) to 138-113=25
  // After 1.25 scale → y:0 to 31 in photo buffer (top of photo, right side)
  const flagPatch = Buffer.from(
    `<svg width="66" height="40" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="66" height="40" fill="white"/></svg>`
  );
  const rawPhoto = await sharp(srcPath)
    .extract({ left: 0, top: SRC_TOP, width: CARD_W, height: SRC_PHOTO_H })
    .resize(CARD_W, PHOTO_H, { fit: 'fill' })
    .composite([
      { input: flagPatch, left: 228, top: 0 },
    ])
    .toBuffer();

  // 3. Build footer buffer
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

  // 4. Stack all three zones + optional physical sticker overlay
  const composites = [
    { input: header,   left: 0, top: 0 },
    { input: rawPhoto, left: 0, top: HDR_H },
    { input: footer,   left: 0, top: HDR_H + PHOTO_H },
    { input: Buffer.from(`<svg width="${CARD_W}" height="1" xmlns="http://www.w3.org/2000/svg"><rect width="${CARD_W}" height="1" fill="#e2e8f0"/></svg>`), left:0, top:HDR_H },
    { input: Buffer.from(`<svg width="${CARD_W}" height="1" xmlns="http://www.w3.org/2000/svg"><rect width="${CARD_W}" height="1" fill="#1e293b"/></svg>`), left:0, top:HDR_H+PHOTO_H },
  ];

  // If a physical sticker exists on the part in the photo, overlay a 100X badge on it
  if (physicalSticker) {
    const { left: sl, top: st, width: sw, height: sh } = physicalSticker;
    const sLogoBuf = await scaledLogo(sw - 8, sh - 6);
    const sLMeta   = await sharp(sLogoBuf).metadata();
    // Solid white fill FIRST — ensures every pixel of the sticker is covered
    const sFill = Buffer.from(
      `<svg width="${sw}" height="${sh}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect width="${sw}" height="${sh}" fill="white"/></svg>`
    );
    // Styled label with subtle border on top
    const sLabel = Buffer.from(
      `<svg width="${sw}" height="${sh}" xmlns="http://www.w3.org/2000/svg">` +
      `<defs><filter id="s2"><feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-color="#0000001a"/></filter></defs>` +
      `<rect x="1" y="1" width="${sw-2}" height="${sh-2}" rx="5" ry="5"` +
      ` fill="white" stroke="#c8ccd0" stroke-width="0.7" filter="url(#s2)"/>` +
      `</svg>`
    );
    composites.push({ input: sFill,    left: sl, top: st });  // full white cover
    composites.push({ input: sLabel,   left: sl, top: st });  // styled label on top
    composites.push({ input: sLogoBuf,
      left: sl + 4 + Math.floor(((sw-8) - sLMeta.width)  / 2),
      top:  st + 3 + Math.floor(((sh-6) - sLMeta.height) / 2),
    });
  }

  await sharp({
    create: { width: CARD_W, height: CARD_W, channels: 4, background: { r:255,g:255,b:255,alpha:1 } },
  })
  .composite(composites)
  .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
  .toFile(outPath);
}

// ── PRODUCT MACHINES: realistic label ────────────────────────────────────────
// Cover "Best Fogger" with body colour, then overlay the 100X logo
// as a clean adhesive-label style badge (white rect + logo centred)
const MACHINES = [
  { file:'bf150-3.jpg', slug:'bf150-final',
    // sticker spans roughly x:228-405 on the 790px wide image
    sticker:{ left:224, top:96, width:188, height:86, bg:{r:180,g:181,b:186} } },
  { file:'bf200.jpg',   slug:'bf200-final',
    sticker:{ left:152, top:27, width:118, height:75, bg:{r:183,g:181,b:188} } },
  { file:'bf105.jpg',   slug:'bf105-final',
    sticker:{ left:148, top:78, width:118, height:44, bg:{r:239,g:239,b:241} } },
  { file:'bf115.jpg',   slug:'bf115-final',
    sticker:{ left:148, top:78, width:118, height:44, bg:{r:239,g:239,b:241} } },
  { file:'bf400-1.jpg', slug:'bf400-final',
    sticker:{ left:232, top:31, width:92, height:64, bg:{r:202,g:200,b:194} } },
  { file:'2000old.jpg', slug:'mini2000c-final', sticker:null },
  { file:'2000new.jpg', slug:'mini2000n-final', sticker:null },
];

async function processMachine(job) {
  const src = path.join(TMP, job.file);
  const out = path.join(OUT, job.file);
  if (!fs.existsSync(src)) return null;
  if (!job.sticker) { fs.copyFileSync(src, out); return out; }

  const s = job.sticker;
  const PAD = 8;
  const logoW = s.width  - PAD * 2;
  const logoH = s.height - PAD * 2;
  const logoBuf  = await scaledLogo(logoW, logoH);
  const lMeta    = await sharp(logoBuf).metadata();

  // Body-colour fill (exact match to surrounding machine surface)
  const fill = Buffer.from(
    `<svg width="${s.width}" height="${s.height}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="${s.width}" height="${s.height}" fill="rgb(${s.bg.r},${s.bg.g},${s.bg.b})"/>` +
    `</svg>`
  );

  // White label sticker with very subtle border + shadow
  const R = Math.round(Math.min(s.width, s.height) * 0.12); // corner radius
  const label = Buffer.from(
    `<svg width="${s.width}" height="${s.height}" xmlns="http://www.w3.org/2000/svg">` +
    `<defs><filter id="sh" x="-5%" y="-5%" width="110%" height="110%">` +
    `<feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-color="#00000022"/></filter></defs>` +
    `<rect x="3" y="2" width="${s.width-6}" height="${s.height-5}" rx="${R}" ry="${R}"` +
    ` fill="white" stroke="#c8ccd0" stroke-width="0.8" filter="url(#sh)"/>` +
    `</svg>`
  );

  await sharp(src)
    .composite([
      { input: fill,    left: s.left, top: s.top },
      { input: label,   left: s.left, top: s.top },
      { input: logoBuf,
        left: s.left + PAD + Math.floor((logoW - lMeta.width)  / 2),
        top:  s.top  + PAD + Math.floor((logoH - lMeta.height) / 2),
      },
    ])
    .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
    .toFile(out);
  return out;
}

// Parts whose PRODUCT PHOTO has a physical "Best Fogger" sticker on the part itself
// coordinates in final card space — we overlay a 100X badge on the physical sticker
const PHYSICAL_STICKERS = {
  // wider + higher than actual sticker — white fill ensures complete coverage
  'ถังน้ำยาอะไหล่เบสBF150-BF200.jpg': { left:50, top:98, width:112, height:88 },
  'ถังน้ำมัน-อะไหล่BF150-BF200.jpg': { left:50, top:98, width:112, height:88 },
};

// ── Spare parts file list ─────────────────────────────────────────────────────
const SPARE_FILES = [
  'ถังน้ำยาอะไหล่เบสBF150-BF200.jpg','ถังน้ำมัน-อะไหล่BF150-BF200.jpg',
  'ข้อต่อถังน้ำยาอะไหล่BF150-BF200.jpg','ฝาปิดถังน้ำยาลูกยางกันกลับBF150.jpg',
  'ฝาปิดถังน้ำมัน.jpg','ปะเก็นฝาถังBF150-BF200.jpg','ไส้กรองน้ำมันBF150-BF200.jpg',
  'วาล์วปิดเปิดน้ำยาBF150-BF200.jpg','วาล์วปรับน้ำยาเคมีBF150-BF200.jpg',
  'ลูกยางกันกลับน้ำมันBF150.jpg','ลูกยางกันกลับน้ำยาลูกยางกันกลับBF150.jpg',
  'วาล์วกันกลับBF150-BF200.jpg','วาล์วกันกลับถังน้ำยาBF150.jpg',
  'วาล์วน้ำมันเชื้อเพลิง.jpg','ข้อต่อสามทางBF150-BF200.jpg',
  'ข้อต่อหัวฉีดเฟรมบBF150-BF200.jpg','หัวฉีดน้ำมันBF150-BF200.jpg',
  'คาร์บูเรเตอร์ตัวบน.jpg','คาร์บูเรเตอร์ตัวล่าง.jpg',
  'ข้อต่อฉากคาร์บูเรเตอร์BF150-BF200.jpg','แผ่นเพลทข้อต่อฉากคาร์บูเรเตอร์BF150-BF200.jpg',
  'แผ่นเพลทคาร์บูเรเตอร์.jpg','แผ่นไดอะเฟรมBF150-BF200.jpg',
  'ปะเก็นคาบูเรเตอร์BF150-BF200.jpg','กรวยคาร์บูเรเตอร์ตัวบน.jpg',
  'กรวยคาร์บูเรเตอร์BF150-BF200.jpg','น๊อตคาร์บูเรเตอร์-บน-สั้นBF150-BF200.jpg',
  'น๊อตกลางห้องคาร์บูBF150-BF200.jpg','น๊อตปิดท้ายคาร์บูเรเตอร์.jpg',
  'หัวเทียน.jpg','แบตเตอรี่เท่าBF150-BF200.jpg','แบตเตอรี่เทียบเท่าBF150-BF200.jpg',
  'คอล์ยไฟBF150-BF200.jpg','สวิสสตาร์ทBF150-BF200.jpg',
  'แจ็คชาร์จแบตแบตเตอรี่BF150-BF200.jpg','อะแดปเตอร์ชาร์จตัวเดิม.jpg',
  'อะแดปเตอร์ชาร์จตัวใหม่.jpg','สายไฟขั้วบวก.jpg','สายไฟขั้วลบ.jpg',
  'สายไฟเข้าปั๊มลมBF150-BF200.jpg','ปั๊มลมBF150-BF200.jpg','ปั๊มลมเทียบเท่า1BF150-BF200.jpg',
  'สายลมBF150-BF200.jpg','สายน้ำมันBF150-BF200.jpg','สายยางปั๊มลมBF150-BF200.jpg',
  'เฟรมเครื่องลูกยางกันกลับBF150-BF200.jpg','ตะแกรงกันความร้อนBF150.jpg',
  'ตะแกรงกันความร้อนBF150-BF200.jpg','ตะแกรงกันความร้อนตัวนอก.jpg',
  'ท่อระบายความร้อนตัวในBF150-BF200.jpg','ท่อระบายความร้อนตัวนอกสั้น.jpg',
  'ท่อเฝาไหม้แบตเตอรี่BF150-BF200.jpg',
  'วาล์วสับหมอกควันBF200.jpg','ข้อต่อถังน้ำมันBF150-BF200.jpg',
  '57.jpg','61.jpg','62.jpg','63.jpg','64.jpg','65.jpg','67.jpg','68.jpg',
];

// numbered images are raw photos — just add subtle corner logo watermark
const NUMBERED = new Set(['57.jpg','61.jpg','62.jpg','63.jpg','64.jpg','65.jpg','67.jpg','68.jpg']);

async function watermarkRaw(srcPath, outPath) {
  const { width: W, height: H } = await sharp(srcPath).metadata();
  const lW = Math.round(W * 0.26), lH = Math.round(lW / 3);
  const logoBuf = await scaledLogo(lW, lH);
  const lMeta   = await sharp(logoBuf).metadata();
  const pillW   = lMeta.width + 14, pillH = lMeta.height + 10;
  const pill = await sharp({
    create: { width: pillW, height: pillH, channels: 4, background: { r:255, g:255, b:255, alpha:230 } },
  }).composite([{ input: logoBuf, left: 7, top: 5 }]).png().toBuffer();

  const ext = path.extname(outPath).toLowerCase();
  const s = sharp(srcPath).composite([{ input: pill, gravity: 'southeast' }]);
  await (ext === '.png' ? s.png({quality:95}) : s.jpeg({quality:95})).toFile(outPath);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   100X Circle — Final Rebrand                ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  const urlMap = {};

  // ── Spare parts ─────────────────────────────────────────────────────────────
  console.log(`Processing ${SPARE_FILES.length} spare parts...\n`);
  for (const file of SPARE_FILES) {
    const src = await downloadIfMissing(file);
    if (!src) { console.log(`  ✗ skip: ${file}`); continue; }

    const outFile = path.join(OUT, file.endsWith('.png') ? file.replace('.png','.jpg') : file);
    const slug    = 'f-' + Buffer.from(file).toString('base64').replace(/[^a-zA-Z0-9]/g,'').slice(0,55);

    try {
      if (NUMBERED.has(file)) {
        await watermarkRaw(src, outFile);
      } else {
        const meta = await sharp(src).metadata();
        if (meta.width === 300 && meta.height === 300) {
          await buildSpareCard(src, outFile, PHYSICAL_STICKERS[file] || null);
        } else {
          await watermarkRaw(src, outFile);
        }
      }
      const res  = await upload(outFile, slug);
      urlMap[file] = res.secure_url;
      process.stdout.write(`  ✓ ${file.slice(0,42).padEnd(42)} → uploaded\n`);
    } catch (e) {
      console.log(`  ✗ ${file}: ${e.message}`);
    }
  }

  // ── Machines ─────────────────────────────────────────────────────────────────
  console.log(`\nProcessing ${MACHINES.length} machine images...\n`);
  for (const job of MACHINES) {
    const src = path.join(TMP, job.file);
    if (!fs.existsSync(src)) { console.log(`  ✗ missing: ${job.file}`); continue; }
    try {
      const out = await processMachine(job);
      const res = await upload(out, job.slug);
      urlMap[job.file] = res.secure_url;
      console.log(`  ✓ ${job.file.padEnd(18)} → ${res.secure_url.split('/').pop()}`);
    } catch (e) {
      console.log(`  ✗ ${job.file}: ${e.message}`);
    }
  }

  // Save map
  const mapPath = path.join(TMP, 'final-url-map.json');
  fs.writeFileSync(mapPath, JSON.stringify(urlMap, null, 2));
  console.log(`\n✓ ${Object.keys(urlMap).length} images done. Map: ${mapPath}\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
