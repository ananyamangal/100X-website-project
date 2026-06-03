/**
 * rebrand-v2.mjs — Professional 100X Circle image rebranding
 *
 * SPARE PARTS (300×300 catalog cards):
 *   • Top zone (y 0–90):  white header + real 100X logo PNG left, "Genuine Korean OEM" right
 *   • Middle (y 90–265):  product photo — untouched
 *   • Bottom (y 265–300): dark slate footer "100X Circle | Korean OEM Parts"
 *
 * PRODUCT MACHINES (various sizes):
 *   • Cover "Best Fogger" sticker with body-colour fill
 *   • Overlay white oval sticker with the real 100X logo PNG centred
 *
 * Run: node scripts/rebrand-v2.mjs
 */

import sharp from '../node_modules/sharp/lib/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import https from 'https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');
const TMP       = path.join(ROOT, '.rebrand-tmp');
const OUT       = path.join(ROOT, '.rebrand-out-v2');
const LOGO_PATH = path.join(ROOT, 'public', 'logo-main.png');
const VENDOR    = 'https://www.bestfoggerthailand.com/wp-content/uploads/2025/08';
const CLOUD     = 'dhbvzugv6';
const PRESET    = 'product_uploads';
const FOLDER    = '100x-products';

[TMP, OUT].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d); });

// ── Helpers ──────────────────────────────────────────────────────────────────

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}: ${url}`));
      const c = []; res.on('data', d => c.push(d)); res.on('end', () => resolve(Buffer.concat(c)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function downloadIfMissing(filename) {
  const encoded = filename.split('').map(c => encodeURIComponent(c)).join('');
  const url  = `${VENDOR}/${encoded}`;
  const dest = path.join(TMP, filename);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 500) return dest;
  const buf = await fetchBuffer(url).catch(() => null);
  if (!buf) return null;
  fs.writeFileSync(dest, buf);
  return dest;
}

async function uploadToCloudinary(filePath, publicId) {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1) || 'jpg';
  const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
  const boundary = `Boundary${Date.now()}`;
  const add = (n, v) => `--${boundary}\r\nContent-Disposition: form-data; name="${n}"\r\n\r\n${v}\r\n`;
  const body = Buffer.concat([
    Buffer.from([add('upload_preset', PRESET), add('folder', FOLDER), add('public_id', publicId)].join('')),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${path.basename(filePath)}"\r\nContent-Type: ${mime}\r\n\r\n`),
    buf,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.cloudinary.com', path: `/v1_1/${CLOUD}/image/upload`, method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length },
    }, res => {
      const c = []; res.on('data', d => c.push(d)); res.on('end', () => {
        const j = JSON.parse(Buffer.concat(c).toString());
        j.error ? reject(new Error(j.error.message)) : resolve(j);
      });
    });
    req.on('error', reject); req.write(body); req.end();
  });
}

// ── Logo loading ──────────────────────────────────────────────────────────────
// Returns the logo resized to requested width (maintains aspect ratio)

async function logoResized(targetW, targetH) {
  return sharp(LOGO_PATH).resize(targetW, targetH, { fit: 'inside', background: { r:255,g:255,b:255,alpha:1 } }).png().toBuffer();
}

// ── Spare-part card redesign (300×300) ────────────────────────────────────────

async function redesignSpareCard(srcPath, outPath) {
  const W = 300, H = 300;
  // Original zones (measured from pixel scan):
  //   0–48   : "Best Fogger" logo box
  //  48–70   : English part name (bold, large) — KEEP
  //  70–112  : Thai text translation          — WHITE FILL
  // 112–265  : Product photo                 — KEEP
  // 265–300  : Orange/red banner             — REPLACE
  const LOGO_ZONE_H = 48;
  const ENG_TOP = 48;   const ENG_H = 22;  // English name slice from original
  const THAI_H = 42;                         // white-fill to erase Thai text
  const PHOTO_TOP = ENG_TOP + ENG_H + THAI_H; // 112
  const FOOTER_Y = 265;
  const FOOTER_H = H - FOOTER_Y; // 35px
  const photoH = FOOTER_Y - PHOTO_TOP; // 153px

  // 1a. Extract English text slice (keep — already English)
  const engSlice = await sharp(srcPath)
    .extract({ left: 0, top: ENG_TOP, width: W, height: ENG_H })
    .toBuffer();

  // 1b. Extract product photo
  const photo = await sharp(srcPath)
    .extract({ left: 0, top: PHOTO_TOP, width: W, height: photoH })
    .toBuffer();

  const TOP_H = LOGO_ZONE_H; // alias used below

  // 2. Build new header (white bg + logo + text)
  const LOGO_W = 110, LOGO_H = 37;
  const logoBuf = await logoResized(LOGO_W, LOGO_H);

  const header = await sharp({
    create: { width: W, height: TOP_H, channels: 4, background: { r:255, g:255, b:255, alpha:1 } },
  })
  .composite([
    // Logo placed at (8, 10)
    { input: logoBuf, left: 8, top: Math.floor((TOP_H - LOGO_H) / 2) },
    // "Genuine Korean OEM Parts" text badge on right
    {
      input: Buffer.from(`<svg width="150" height="${TOP_H}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="18" width="148" height="54" rx="6" fill="#f1f5f9"/>
        <rect x="0" y="18" width="148" height="54" rx="6" fill="none" stroke="#e2e8f0" stroke-width="1"/>
        <text x="74" y="42" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="9.5" fill="#1e293b">GENUINE KOREAN OEM</text>
        <text x="74" y="56" text-anchor="middle" font-family="Arial,sans-serif" font-weight="400" font-size="8.5" fill="#64748b">Tested • Certified • Genuine</text>
      </svg>`),
      left: W - 152,
      top: 0,
    },
  ])
  .png()
  .toBuffer();

  // 3. Build footer (dark slate background + branded text)
  const footer = await sharp({
    create: { width: W, height: FOOTER_H, channels: 4, background: { r:15, g:23, b:42, alpha:1 } },
  })
  .composite([{
    input: Buffer.from(`<svg width="${W}" height="${FOOTER_H}" xmlns="http://www.w3.org/2000/svg">
      <text x="12" y="${Math.round(FOOTER_H * 0.58)}" font-family="Arial,sans-serif" font-weight="700" font-size="10" fill="#ffffff">100X Circle</text>
      <text x="90" y="${Math.round(FOOTER_H * 0.58)}" font-family="Arial,sans-serif" font-weight="400" font-size="9" fill="#94a3b8"> |  Korean OEM Spare Parts</text>
    </svg>`),
    left: 0, top: 0,
  }])
  .png()
  .toBuffer();

  // 4. Stack: header + english name + white spacer (covers Thai) + photo + footer
  const whiteRow = Buffer.from(
    `<svg width="${W}" height="${THAI_H}" xmlns="http://www.w3.org/2000/svg"><rect width="${W}" height="${THAI_H}" fill="white"/></svg>`
  );
  await sharp({
    create: { width: W, height: H, channels: 4, background: { r:255,g:255,b:255,alpha:1 } },
  })
  .composite([
    { input: header,   left: 0, top: 0 },
    { input: engSlice, left: 0, top: LOGO_ZONE_H },
    // Cover QR code (top-right) in English text zone — x:192-300
    { input: Buffer.from(`<svg width="108" height="${ENG_H}" xmlns="http://www.w3.org/2000/svg"><rect width="108" height="${ENG_H}" fill="white"/></svg>`), left: 192, top: LOGO_ZONE_H },
    { input: whiteRow, left: 0, top: LOGO_ZONE_H + ENG_H },   // covers Thai text + rest of QR
    { input: photo,    left: 0, top: PHOTO_TOP },
    { input: footer,   left: 0, top: FOOTER_Y },
    // separator lines
    { input: Buffer.from(`<svg width="${W}" height="1" xmlns="http://www.w3.org/2000/svg"><rect width="${W}" height="1" fill="#e2e8f0"/></svg>`), left: 0, top: LOGO_ZONE_H },
    { input: Buffer.from(`<svg width="${W}" height="1" xmlns="http://www.w3.org/2000/svg"><rect width="${W}" height="1" fill="#334155"/></svg>`), left: 0, top: FOOTER_Y },
  ])
  .jpeg({ quality: 93 })
  .toFile(outPath);
}

// ── Machine product image processing ─────────────────────────────────────────

const MACHINE_JOBS = [
  {
    file: 'bf150-3.jpg', slug: '100x-bf150-v3',
    // sticker area on body panel: cover then overlay logo sticker
    sticker: { left: 232, top: 98, width: 168, height: 82, bg: { r:185, g:188, b:197 } },
  },
  {
    file: 'bf200.jpg', slug: '100x-bf200-v3',
    sticker: { left: 156, top: 29, width: 110, height: 70, bg: { r:188, g:186, b:194 } },
  },
  {
    file: 'bf105.jpg', slug: '100x-bf105-v3',
    sticker: { left: 155, top: 82, width: 108, height: 38, bg: { r:238, g:238, b:240 } },
  },
  {
    file: 'bf115.jpg', slug: '100x-bf115-v3',
    sticker: { left: 155, top: 82, width: 108, height: 38, bg: { r:238, g:238, b:240 } },
  },
  {
    file: 'bf400-1.jpg', slug: '100x-bf400-v3',
    sticker: { left: 238, top: 35, width: 84, height: 58, bg: { r:208, g:206, b:200 } },
  },
  { file: '2000old.jpg', slug: '100x-mini2000-classic-v3', sticker: null },
  { file: '2000new.jpg', slug: '100x-mini2000-new-v3',     sticker: null },
];

async function processMachine(job) {
  const src = path.join(TMP, job.file);
  const out = path.join(OUT, job.file);
  if (!fs.existsSync(src)) return null;

  if (!job.sticker) {
    fs.copyFileSync(src, out);
    return out;
  }

  const s = job.sticker;
  // Logo sticker: white rounded rect + logo PNG centred inside
  const PAD = 6;
  const logoW = s.width  - PAD * 2;
  const logoH = s.height - PAD * 2;
  const logoBuf = await logoResized(logoW, logoH);

  // Get actual logo size after resize
  const logoMeta = await sharp(logoBuf).metadata();
  const lw = logoMeta.width, lh = logoMeta.height;

  // White oval background SVG (same size as sticker area)
  const ovalSvg = Buffer.from(
    `<svg width="${s.width}" height="${s.height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="${s.width-4}" height="${s.height-4}" rx="${Math.round(s.height*0.2)}" ry="${Math.round(s.height*0.2)}"
        fill="white" stroke="#d1d5db" stroke-width="1.5"
        filter="url(#sh)"/>
      <defs>
        <filter id="sh" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#00000018"/>
        </filter>
      </defs>
    </svg>`
  );

  const composites = [
    // 1. body-colour fill over the "Best Fogger" sticker
    {
      input: Buffer.from(`<svg width="${s.width}" height="${s.height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${s.width}" height="${s.height}" fill="rgb(${s.bg.r},${s.bg.g},${s.bg.b})"/>
      </svg>`),
      left: s.left, top: s.top,
    },
    // 2. white oval sticker plate
    { input: ovalSvg, left: s.left, top: s.top },
    // 3. 100X logo centred inside the oval
    {
      input: logoBuf,
      left: s.left + PAD + Math.floor((logoW - lw) / 2),
      top:  s.top  + PAD + Math.floor((logoH - lh) / 2),
    },
  ];

  await sharp(src).composite(composites).jpeg({ quality: 93 }).toFile(out);
  return out;
}

// ── Spare part file list (all Thai-named + numbered) ─────────────────────────

const SPARE_FILES = [
  // Thai-named catalog images
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
  // Numbered (likely raw photos — add corner watermark only)
  '57.jpg','61.jpg','62.jpg','63.jpg','64.jpg','65.jpg','67.jpg','68.jpg',
];

// For numbered images (raw photos, not 300×300 catalog) — just add small logo corner
async function watermarkCorner(srcPath, outPath) {
  const meta = await sharp(srcPath).metadata();
  const { width: W, height: H } = meta;

  const LW = Math.round(W * 0.28);
  const LH = Math.round(LW * 0.33);
  const logoBuf = await logoResized(LW, LH);
  const lMeta = await sharp(logoBuf).metadata();

  // White pill background for corner logo
  const pillW = lMeta.width + 12, pillH = lMeta.height + 8;
  const pill = await sharp({
    create: { width: pillW, height: pillH, channels: 4, background: { r:255,g:255,b:255,alpha:240 } },
  })
  .composite([{ input: logoBuf, left: 6, top: 4 }])
  .png().toBuffer();

  const ext = path.extname(outPath).toLowerCase();
  const s = sharp(srcPath).composite([
    { input: pill, gravity: 'southeast', blend: 'over' },
  ]);
  if (ext === '.png') await s.png({ quality: 95 }).toFile(outPath);
  else await s.jpeg({ quality: 93 }).toFile(outPath);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  100X Circle — Image Rebrand v2        ║');
  console.log('╚════════════════════════════════════════╝\n');

  const dbUpdates = {};  // file → cloudinary URL

  // ── Process spare parts ──────────────────────────────────────────────────
  console.log(`Processing ${SPARE_FILES.length} spare part images...\n`);

  for (const filename of SPARE_FILES) {
    const srcPath = await downloadIfMissing(filename);
    if (!srcPath) { console.log(`  ✗ Skip (download failed): ${filename}`); continue; }

    const outPath = path.join(OUT, filename.endsWith('.png') ? filename.replace('.png','.jpg') : filename);
    const ext = path.extname(filename).toLowerCase();

    try {
      const meta = await sharp(srcPath).metadata();
      const is300 = meta.width === 300 && meta.height === 300;

      if (is300) {
        await redesignSpareCard(srcPath, outPath);
      } else {
        // Numbered raw part photo
        const outRaw = path.join(OUT, filename);
        await watermarkCorner(srcPath, outRaw);
        Object.assign(srcPath, outRaw);  // noop — just so lint is happy
      }

      // Build cloudinary public_id from filename
      const slug = filename
        .replace(/\.[^.]+$/, '')
        .replace(/[^\x00-\x7E]/g, match => Buffer.from(match).toString('hex').slice(0, 8))
        .replace(/[^a-zA-Z0-9_-]/g, '-')
        .slice(0, 60)
        .replace(/-+$/, '');

      const res = await uploadToCloudinary(
        is300 ? outPath : path.join(OUT, filename),
        `sp-${slug}`
      );
      dbUpdates[filename] = res.secure_url;
      process.stdout.write(`  ✓ ${filename.slice(0,40).padEnd(40)} → ${res.secure_url.split('/').slice(-1)[0]}\n`);
    } catch (err) {
      console.log(`  ✗ ${filename}: ${err.message}`);
    }
  }

  // ── Process machine images ───────────────────────────────────────────────
  console.log(`\nProcessing ${MACHINE_JOBS.length} product machine images...\n`);

  for (const job of MACHINE_JOBS) {
    try {
      const out = await processMachine(job);
      if (!out) { console.log(`  ✗ ${job.file}: source missing`); continue; }
      const res = await uploadToCloudinary(out, job.slug);
      dbUpdates[job.file] = res.secure_url;
      console.log(`  ✓ ${job.file.padEnd(18)} → ${res.secure_url.split('/').slice(-1)[0]}`);
    } catch (err) {
      console.log(`  ✗ ${job.file}: ${err.message}`);
    }
  }

  // ── Save URL map ─────────────────────────────────────────────────────────
  const mapPath = path.join(TMP, 'rebrand-v2-map.json');
  fs.writeFileSync(mapPath, JSON.stringify(dbUpdates, null, 2));
  console.log(`\n✓ URL map saved: ${mapPath}`);
  console.log(`Total processed: ${Object.keys(dbUpdates).length} images\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
