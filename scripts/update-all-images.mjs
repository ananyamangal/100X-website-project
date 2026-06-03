/**
 * update-all-images.mjs
 * Reads .rebrand-tmp/rebrand-v2-map.json and updates MongoDB:
 *   - products collection (imageUrls + filmChapters)
 *   - spare_parts collection (images array)
 */
import { MongoClient } from '../node_modules/mongodb/lib/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readMongoUri() {
  for (const f of ['.env.local', '.env']) {
    try {
      const c = fs.readFileSync(path.join(ROOT, f), 'utf8');
      const m = c.match(/^MONGODB_URI=(.+)$/m);
      if (m) return m[1].trim();
    } catch {}
  }
  throw new Error('MONGODB_URI not found');
}

// Vendor CDN base → map to Cloudinary
const VENDOR_BASE = 'https://www.bestfoggerthailand.com/wp-content/uploads/2025/08';

// Product file → product slug in MongoDB
const PRODUCT_MAP = {
  'bf150-3.jpg': '100x-thermal-fogger-bf150',
  'bf200.jpg':   '100x-thermal-fogger-bf200',
  'bf105.jpg':   '100x-ulv-cold-fogger-bf105',
  'bf115.jpg':   '100x-ulv-cold-fogger-bf115',
  'bf400-1.jpg': '100x-heavy-duty-thermal-fogger-bf400',
  '2000old.jpg': '100x-minisuper-2000-gold-classic',
  '2000new.jpg': '100x-minisuper-2000-gold-new',
};

async function main() {
  const mapPath = path.join(ROOT, '.rebrand-tmp', 'rebrand-v2-map.json');
  const urlMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  // urlMap[filename] = cloudinary_url

  const uri = readMongoUri();
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('100xDB');

  console.log('\n=== Updating Products ===\n');
  const products = db.collection('products');
  for (const [file, newUrl] of Object.entries(urlMap)) {
    const slug = PRODUCT_MAP[file];
    if (!slug) continue;

    const doc = await products.findOne({ slug });
    if (!doc) { console.log(`  ✗ NOT FOUND product: ${slug}`); continue; }

    // Update imageUrls
    const oldUrl = `${VENDOR_BASE}/${file}`;
    const patchedChapters = (doc.filmChapters || []).map(ch =>
      ch.imageUrl === oldUrl ? { ...ch, imageUrl: newUrl } : ch
    );

    await products.updateOne({ slug }, {
      $set: { imageUrls: [newUrl], filmChapters: patchedChapters, updatedAt: new Date().toISOString() }
    });
    console.log(`  ✓ Product: ${slug}`);
  }

  console.log('\n=== Updating Spare Parts ===\n');
  const parts = db.collection('spare_parts');
  const allParts = await parts.find({}).toArray();
  let updated = 0;

  for (const part of allParts) {
    if (!Array.isArray(part.images) || !part.images.length) continue;

    const newImages = part.images.map(img => {
      if (typeof img !== 'string') return img;
      // Extract filename from URL
      const filename = decodeURIComponent(img.split('/').pop());
      return urlMap[filename] || img;
    });

    const changed = newImages.some((img, i) => img !== part.images[i]);
    if (!changed) continue;

    await parts.updateOne({ _id: part._id }, {
      $set: { images: newImages, updatedAt: new Date().toISOString() }
    });
    updated++;
    console.log(`  ✓ ${part.name?.slice(0, 55)}`);
  }

  console.log(`\n  Updated ${updated} spare parts`);
  await client.close();
  console.log('\n=== All Done ===\n');
}

main().catch(e => { console.error(e); process.exit(1); });
