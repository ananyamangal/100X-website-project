/**
 * update-product-images.mjs
 * Updates MongoDB product imageUrls with the rebranded Cloudinary URLs.
 * Run after rebrand-images.mjs succeeds.
 */

import { MongoClient } from '../node_modules/mongodb/lib/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function readMongoUri() {
  for (const f of ['.env.local', '.env']) {
    try {
      const content = fs.readFileSync(path.join(ROOT, f), 'utf8');
      const match = content.match(/^MONGODB_URI=(.+)$/m);
      if (match) return match[1].trim();
    } catch {}
  }
  throw new Error('MONGODB_URI not found');
}

// product slug → new Cloudinary URL (from rebrand-images.mjs output)
const UPDATES = [
  {
    slug: '100x-thermal-fogger-bf150',
    imageUrl: 'https://res.cloudinary.com/dhbvzugv6/image/upload/v1780512550/100x-products/100x-bf150-v2.jpg',
  },
  {
    slug: '100x-thermal-fogger-bf200',
    imageUrl: 'https://res.cloudinary.com/dhbvzugv6/image/upload/v1780512550/100x-products/100x-bf200-v2.jpg',
  },
  {
    slug: '100x-ulv-cold-fogger-bf105',
    imageUrl: 'https://res.cloudinary.com/dhbvzugv6/image/upload/v1780512551/100x-products/100x-bf105-v2.jpg',
  },
  {
    slug: '100x-ulv-cold-fogger-bf115',
    imageUrl: 'https://res.cloudinary.com/dhbvzugv6/image/upload/v1780512552/100x-products/100x-bf115-v2.jpg',
  },
  {
    slug: '100x-heavy-duty-thermal-fogger-bf400',
    imageUrl: 'https://res.cloudinary.com/dhbvzugv6/image/upload/v1780512553/100x-products/100x-bf400-v2.jpg',
  },
  {
    slug: '100x-minisuper-2000-gold-classic',
    imageUrl: 'https://res.cloudinary.com/dhbvzugv6/image/upload/v1780512554/100x-products/100x-mini2000-classic-v2.jpg',
  },
  {
    slug: '100x-minisuper-2000-gold-new',
    imageUrl: 'https://res.cloudinary.com/dhbvzugv6/image/upload/v1780512555/100x-products/100x-mini2000-new-v2.jpg',
  },
];

async function main() {
  const uri = readMongoUri();
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('100xDB');
  const col = db.collection('products');

  console.log('\n=== Updating product image URLs in MongoDB ===\n');

  for (const u of UPDATES) {
    const result = await col.updateOne(
      { slug: u.slug },
      {
        $set: {
          imageUrls: [u.imageUrl],
          updatedAt: new Date().toISOString(),
        },
      }
    );
    if (result.matchedCount === 0) {
      console.log(`  ✗ NOT FOUND: ${u.slug}`);
    } else {
      console.log(`  ✓ Updated: ${u.slug}`);
      console.log(`    → ${u.imageUrl}`);
    }
  }

  // Also update any film chapter images that still point to bestfoggerthailand CDN
  // (replace with the corresponding new Cloudinary URL)
  const OLD_TO_NEW = {
    'https://www.bestfoggerthailand.com/wp-content/uploads/2025/08/bf150-3.jpg': UPDATES[0].imageUrl,
    'https://www.bestfoggerthailand.com/wp-content/uploads/2025/08/bf200.jpg':   UPDATES[1].imageUrl,
    'https://www.bestfoggerthailand.com/wp-content/uploads/2025/08/bf105.jpg':   UPDATES[2].imageUrl,
    'https://www.bestfoggerthailand.com/wp-content/uploads/2025/08/bf115.jpg':   UPDATES[3].imageUrl,
    'https://www.bestfoggerthailand.com/wp-content/uploads/2025/08/bf400-1.jpg': UPDATES[4].imageUrl,
    'https://www.bestfoggerthailand.com/wp-content/uploads/2025/08/2000old.jpg': UPDATES[5].imageUrl,
    'https://www.bestfoggerthailand.com/wp-content/uploads/2025/08/2000new.jpg': UPDATES[6].imageUrl,
  };

  console.log('\n=== Patching filmChapter imageUrls ===\n');

  // Fetch all affected products and patch filmChapters in-memory then save
  for (const u of UPDATES) {
    const doc = await col.findOne({ slug: u.slug });
    if (!doc || !Array.isArray(doc.filmChapters)) continue;

    let changed = false;
    const patched = doc.filmChapters.map(ch => {
      if (ch.imageUrl && OLD_TO_NEW[ch.imageUrl]) {
        changed = true;
        return { ...ch, imageUrl: OLD_TO_NEW[ch.imageUrl] };
      }
      return ch;
    });

    if (changed) {
      await col.updateOne({ slug: u.slug }, { $set: { filmChapters: patched } });
      console.log(`  ✓ Patched filmChapters: ${u.slug}`);
    }
  }

  await client.close();
  console.log('\n=== Done ===\n');
}

main().catch(e => { console.error(e); process.exit(1); });
