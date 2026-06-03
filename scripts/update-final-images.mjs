/**
 * update-final-images.mjs — updates MongoDB with the FINAL rebranded image URLs
 *
 * Products: matched by slug, imageUrls replaced
 * Spare parts: current images point to v2 Cloudinary URLs (from rebrand-v2-map.json)
 *              We build a reverse map v2URL→finalURL and update all parts
 */
import { MongoClient } from '../node_modules/mongodb/lib/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readMongoUri() {
  for (const f of ['.env.local', '.env']) {
    try { const c = fs.readFileSync(path.join(ROOT, f), 'utf8'); const m = c.match(/^MONGODB_URI=(.+)$/m); if (m) return m[1].trim(); } catch {}
  }
  throw new Error('MONGODB_URI not found');
}

const PRODUCT_MAP = {
  'bf150-3.jpg': '100x-thermal-fogger-bf150',
  'bf200.jpg':   '100x-thermal-fogger-bf200',
  'bf105.jpg':   '100x-ulv-cold-fogger-bf105',
  'bf115.jpg':   '100x-ulv-cold-fogger-bf115',
  'bf400-1.jpg': '100x-heavy-duty-thermal-fogger-bf400',
  '2000old.jpg': '100x-minisuper-2000-gold-classic',
  '2000new.jpg': '100x-minisuper-2000-gold-new',
};

const VENDOR = 'https://www.bestfoggerthailand.com/wp-content/uploads/2025/08';

async function main() {
  // Load both URL maps
  const v2Map    = JSON.parse(fs.readFileSync(path.join(ROOT, '.rebrand-tmp', 'rebrand-v2-map.json'),  'utf8'));
  const finalMap = JSON.parse(fs.readFileSync(path.join(ROOT, '.rebrand-tmp', 'final-url-map.json'),   'utf8'));

  // Build reverse maps: old URL → final URL
  // Covers two possible current states:
  //   (a) still pointing to bestfoggerthailand.com CDN (original)
  //   (b) pointing to v2 Cloudinary (after previous update run)
  const oldToFinal = {};
  for (const [file, finalUrl] of Object.entries(finalMap)) {
    oldToFinal[`${VENDOR}/${file}`]    = finalUrl;  // original CDN → final
    if (v2Map[file]) oldToFinal[v2Map[file]] = finalUrl;  // v2 cloudinary → final
  }

  const client = new MongoClient(readMongoUri());
  await client.connect();
  const db = client.db('100xDB');

  console.log('\n=== Updating Products ===');
  const products = db.collection('products');
  for (const [file, finalUrl] of Object.entries(finalMap)) {
    const slug = PRODUCT_MAP[file]; if (!slug) continue;
    const doc = await products.findOne({ slug }); if (!doc) continue;
    const chapters = (doc.filmChapters || []).map(ch => {
      const nu = oldToFinal[ch.imageUrl]; return nu ? { ...ch, imageUrl: nu } : ch;
    });
    await products.updateOne({ slug }, { $set: { imageUrls: [finalUrl], filmChapters: chapters, updatedAt: new Date().toISOString() } });
    console.log(`  ✓ ${slug}`);
  }

  console.log('\n=== Updating Spare Parts ===');
  const parts = db.collection('spare_parts');
  let n = 0;
  for (const part of await parts.find({}).toArray()) {
    if (!Array.isArray(part.images)) continue;
    const newImgs = part.images.map(img => (typeof img === 'string' && oldToFinal[img]) ? oldToFinal[img] : img);
    if (newImgs.some((v, i) => v !== part.images[i])) {
      await parts.updateOne({ _id: part._id }, { $set: { images: newImgs, updatedAt: new Date().toISOString() } });
      n++;
      process.stdout.write(`  ✓ ${String(part.name).slice(0, 55)}\n`);
    }
  }
  console.log(`\n  ${n} spare parts updated`);
  await client.close();
  console.log('\n=== All done ===\n');
}
main().catch(e => { console.error(e); process.exit(1); });
