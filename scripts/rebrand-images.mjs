/**
 * rebrand-images.mjs
 *
 * Downloads all product images from bestfoggerthailand.com CDN,
 * covers the "Best Fogger" label with a 100X Circle branded sticker,
 * uploads to Cloudinary, and updates MongoDB product records.
 *
 * Usage: node scripts/rebrand-images.mjs
 */

import sharp from '../node_modules/sharp/lib/index.js';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import https from 'https';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Config ────────────────────────────────────────────────────────────────────

const CLOUD   = 'dhbvzugv6';
const PRESET  = 'product_uploads';
const FOLDER  = '100x-products';

const VENDOR  = 'https://www.bestfoggerthailand.com/wp-content/uploads/2025/08';
const VENDOR_MAY = 'https://www.bestfoggerthailand.com/wp-content/uploads/2025/05';

const TMP = path.join(ROOT, '.rebrand-tmp');
const OUT = path.join(ROOT, '.rebrand-out');
[TMP, OUT].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d); });

// ── MongoDB connection ────────────────────────────────────────────────────────

// read MONGODB_URI from env files
function readMongoUri() {
  for (const f of ['.env.local', '.env']) {
    try {
      const content = fs.readFileSync(path.join(ROOT, f), 'utf8');
      const match = content.match(/^MONGODB_URI=(.+)$/m);
      if (match) return match[1].trim();
    } catch {}
  }
  throw new Error('MONGODB_URI not found in .env or .env.local');
}

// ── Image label definitions ───────────────────────────────────────────────────
// Each entry: source URL, label rectangle to cover, output slug for Cloudinary

const PRODUCTS = [
  {
    file: 'bf150-3.jpg',
    slug: '100x-bf150-v2',
    // "Best Fogger" sticker: wide, left-centre on body panel
    labels: [{ left: 232, top: 98, width: 168, height: 82, bg: { r:185, g:188, b:197 } }],
  },
  {
    file: 'bf200.jpg',
    slug: '100x-bf200-v2',
    labels: [{ left: 156, top: 29, width: 110, height: 70, bg: { r:188, g:186, b:194 } }],
  },
  {
    file: 'bf105.jpg',
    slug: '100x-bf105-v2',
    // "Best Fogger" label lower-centre of white ULV body
    labels: [{ left: 155, top: 82, width: 108, height: 38, bg: { r:238, g:238, b:240 } }],
  },
  {
    file: 'bf115.jpg',
    slug: '100x-bf115-v2',
    labels: [{ left: 155, top: 82, width: 108, height: 38, bg: { r:238, g:238, b:240 } }],
  },
  {
    file: 'bf400-1.jpg',
    slug: '100x-bf400-v2',
    // "Best Fogger" label on right barrel top face
    labels: [{ left: 238, top: 35, width: 84, height: 58, bg: { r:208, g:206, b:200 } }],
  },
  {
    file: '2000old.jpg',
    slug: '100x-mini2000-classic-v2',
    labels: [], // no visible label
  },
  {
    file: '2000new.jpg',
    slug: '100x-mini2000-new-v2',
    labels: [], // no visible label
  },
];

// ── 100X Circle label SVG generator ──────────────────────────────────────────
// Creates a branded replacement sticker that matches "Best Fogger" label dimensions

function make100XLabel(width, height) {
  const r = 4; // corner radius
  const midY = Math.floor(height * 0.52);
  const topFontSize = Math.max(Math.round(height * 0.40), 8);
  const botFontSize = Math.max(Math.round(height * 0.28), 6);
  const topY = Math.round(midY * 0.62);
  const botY = midY + Math.round((height - midY) * 0.62);

  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="rnd">
      <rect width="${width}" height="${height}" rx="${r}" ry="${r}"/>
    </clipPath>
  </defs>
  <g clip-path="url(#rnd)">
    <!-- top band dark -->
    <rect x="0" y="0" width="${width}" height="${midY}" fill="#111827"/>
    <!-- bottom band red -->
    <rect x="0" y="${midY}" width="${width}" height="${height - midY}" fill="#dc2626"/>
    <!-- top text: 100X -->
    <text x="${Math.floor(width/2)}" y="${topY}" text-anchor="middle" dominant-baseline="central"
      font-family="Arial Black,Arial,sans-serif" font-weight="900"
      font-size="${topFontSize}" fill="#ffffff" letter-spacing="0.5"
    >100X</text>
    <!-- bottom text: CIRCLE -->
    <text x="${Math.floor(width/2)}" y="${botY}" text-anchor="middle" dominant-baseline="central"
      font-family="Arial,sans-serif" font-weight="700"
      font-size="${botFontSize}" fill="#ffffff" letter-spacing="1"
    >CIRCLE</text>
  </g>
</svg>`);
}

// ── HTTP fetch to buffer ──────────────────────────────────────────────────────

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    proto.get(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// ── Cloudinary unsigned upload ────────────────────────────────────────────────

async function uploadToCloudinary(filePath, publicId) {
  const fileBuffer = fs.readFileSync(filePath);
  const boundary = `----Boundary${Date.now()}`;

  // Build multipart body manually (no external deps)
  const parts = [];
  const add = (name, value) => {
    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`
    );
  };
  add('upload_preset', PRESET);
  add('folder', FOLDER);
  add('public_id', publicId);
  // File part
  const filePart = [
    `--${boundary}\r\n`,
    `Content-Disposition: form-data; name="file"; filename="${path.basename(filePath)}"\r\n`,
    `Content-Type: image/jpeg\r\n\r\n`,
  ].join('');

  const body = Buffer.concat([
    Buffer.from(parts.join('')),
    Buffer.from(filePart),
    fileBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.cloudinary.com',
      path: `/v1_1/${CLOUD}/image/upload`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const json = JSON.parse(Buffer.concat(chunks).toString());
        if (json.error) return reject(new Error(json.error.message));
        resolve(json);
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Process one product image ─────────────────────────────────────────────────

async function processImage(product) {
  const srcUrl = `${VENDOR}/${product.file}`;
  const srcPath = path.join(TMP, product.file);
  const outPath = path.join(OUT, product.file);

  // Download if not already cached
  if (!fs.existsSync(srcPath)) {
    console.log(`  ↓ Downloading ${product.file}...`);
    const buf = await fetchBuffer(srcUrl);
    fs.writeFileSync(srcPath, buf);
  }

  if (product.labels.length === 0) {
    // No label to remove — just copy to out
    fs.copyFileSync(srcPath, outPath);
    console.log(`  ✓ ${product.file} — no label to remove, copied`);
  } else {
    // Load image metadata
    const meta = await sharp(srcPath).metadata();
    const { width, height } = meta;

    // Build composites: cover each label then overlay 100X badge
    const composites = [];

    for (const lbl of product.labels) {
      // 1. Cover with background-color rectangle SVG
      const coverSvg = Buffer.from(
        `<svg width="${lbl.width}" height="${lbl.height}" xmlns="http://www.w3.org/2000/svg">
          <rect width="${lbl.width}" height="${lbl.height}"
            fill="rgb(${lbl.bg.r},${lbl.bg.g},${lbl.bg.b})"/>
        </svg>`
      );

      // 2. 100X Circle label badge SVG
      const labelSvg = make100XLabel(lbl.width, lbl.height);

      composites.push(
        { input: coverSvg,  left: lbl.left, top: lbl.top },
        { input: labelSvg, left: lbl.left, top: lbl.top },
      );
    }

    await sharp(srcPath)
      .composite(composites)
      .jpeg({ quality: 92 })
      .toFile(outPath);

    console.log(`  ✓ ${product.file} — label replaced (${width}x${height})`);
  }

  return outPath;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n=== 100X Circle Image Rebranding Script ===\n');

  const results = [];

  for (const product of PRODUCTS) {
    console.log(`Processing: ${product.file}`);
    try {
      const outPath = await processImage(product);

      console.log(`  ↑ Uploading to Cloudinary as "${FOLDER}/${product.slug}"...`);
      const res = await uploadToCloudinary(outPath, product.slug);
      const url = res.secure_url;
      console.log(`  ✓ Uploaded: ${url}\n`);

      results.push({ file: product.file, slug: product.slug, cloudinaryUrl: url });
    } catch (err) {
      console.error(`  ✗ Error for ${product.file}:`, err.message, '\n');
      results.push({ file: product.file, slug: product.slug, error: err.message });
    }
  }

  console.log('\n=== Results ===');
  console.log(JSON.stringify(results, null, 2));

  // Write results for the MongoDB update step
  fs.writeFileSync(
    path.join(ROOT, '.rebrand-tmp', 'cloudinary-results.json'),
    JSON.stringify(results, null, 2)
  );

  console.log('\nSaved to .rebrand-tmp/cloudinary-results.json');
  console.log('Run the MongoDB update step next.');
}

main().catch(e => { console.error(e); process.exit(1); });
