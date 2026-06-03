/**
 * rebrand-india.mjs
 * Removes all "Korean Technology / Korean OEM" references from MongoDB
 * and replaces with "Made in India" positioning throughout.
 *
 * Market intelligence: Indian buyers, government tender, GeM, ASPEE competition.
 * "Korean" signals expensive import — "Made in India" wins government procurement.
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

// Spec-line replacement rules
function patchSpec(spec) {
  if (typeof spec !== 'string') return spec;
  return spec
    .replace(/Origin:\s*South Korea/gi, 'Manufactured: India')
    .replace(/Origin:\s*Korea/gi,       'Manufactured: India')
    .replace(/Korean Technology/gi,      'Made in India')
    .replace(/Korean OEM/gi,             'Genuine OEM');
}

// Badge/cert replacement rules
function patchBadge(b) {
  if (typeof b !== 'string') return b;
  return b.replace(/Korean Technology/gi, 'Made in India');
}

// Text replacement rules (descriptions, body text)
function patchText(t) {
  if (typeof t !== 'string') return t;
  return t
    .replace(/Korean[- ]engineered\./gi,        'Made in India.')
    .replace(/Korean[- ]engineered,/gi,          'Made in India,')
    .replace(/Korea[- ]engineered/gi,            'Made in India')
    .replace(/Korean technology origin/gi,        'Made in India — Gurugram')
    .replace(/Korean Technology/gi,               'Made in India')
    .replace(/Korean OEM/gi,                      'Genuine OEM')
    .replace(/Korean-origin/gi,                   'Indian-manufactured')
    .replace(/Korea-origin/gi,                    'India-manufactured')
    .replace(/Korean origin/gi,                   'Indian-manufactured')
    .replace(/Origin:\s*South Korea/gi,           'Manufactured: India')
    .replace(/\bKorean\b/g,                       'Indian')
    .replace(/\bSouth Korea\b/g,                  'India')
    .replace(/South Korean/g,                     'Indian');
}

// Film chapter patcher
function patchChapter(ch) {
  return {
    ...ch,
    title:       patchText(ch.title || ''),
    subtitle:    patchText(ch.subtitle || ''),
    description: patchText(ch.description || ''),
  };
}

async function main() {
  const client = new MongoClient(readMongoUri());
  await client.connect();
  const db = client.db('100xDB');
  const now = new Date().toISOString();

  // ── 1. PRODUCTS ────────────────────────────────────────────────────────────
  console.log('\n=== Updating Products ===\n');
  const products = await db.collection('products').find({}).toArray();
  let pCount = 0;

  for (const p of products) {
    const update = {};

    // badges
    if (Array.isArray(p.badges)) {
      const newBadges = p.badges.map(patchBadge);
      if (JSON.stringify(newBadges) !== JSON.stringify(p.badges)) update.badges = newBadges;
    }

    // certifications
    if (Array.isArray(p.certifications)) {
      const newCerts = p.certifications.map(patchBadge);
      if (JSON.stringify(newCerts) !== JSON.stringify(p.certifications)) update.certifications = newCerts;
    }

    // specifications
    if (Array.isArray(p.specifications)) {
      const newSpecs = p.specifications.map(patchSpec);
      if (JSON.stringify(newSpecs) !== JSON.stringify(p.specifications)) update.specifications = newSpecs;
    }

    // shortDescription / detailedDescription / tagline
    for (const field of ['shortDescription', 'detailedDescription', 'tagline', 'h1Title', 'whatsappMessageText']) {
      if (typeof p[field] === 'string') {
        const patched = patchText(p[field]);
        if (patched !== p[field]) update[field] = patched;
      }
    }

    // features
    if (Array.isArray(p.features)) {
      const newFeatures = p.features.map(patchText);
      if (JSON.stringify(newFeatures) !== JSON.stringify(p.features)) update.features = newFeatures;
    }

    // applications
    if (Array.isArray(p.applications)) {
      const newApps = p.applications.map(patchText);
      if (JSON.stringify(newApps) !== JSON.stringify(p.applications)) update.applications = newApps;
    }

    // filmChapters
    if (Array.isArray(p.filmChapters)) {
      const newChapters = p.filmChapters.map(patchChapter);
      if (JSON.stringify(newChapters) !== JSON.stringify(p.filmChapters)) update.filmChapters = newChapters;
    }

    if (Object.keys(update).length > 0) {
      update.updatedAt = now;
      await db.collection('products').updateOne({ _id: p._id }, { $set: update });
      pCount++;
      console.log(`  ✓ ${p.name?.slice(0, 55)}`);
    }
  }
  console.log(`\n  ${pCount} products updated`);

  // ── 2. SPARE PARTS ─────────────────────────────────────────────────────────
  console.log('\n=== Updating Spare Parts ===\n');
  const parts = await db.collection('spare_parts').find({}).toArray();
  let spCount = 0;

  for (const sp of parts) {
    const update = {};

    for (const field of ['name', 'description', 'category']) {
      if (typeof sp[field] === 'string') {
        const patched = patchText(sp[field]);
        if (patched !== sp[field]) update[field] = patched;
      }
    }

    if (Array.isArray(sp.compatibleProductNames)) {
      const newNames = sp.compatibleProductNames.map(patchText);
      if (JSON.stringify(newNames) !== JSON.stringify(sp.compatibleProductNames)) update.compatibleProductNames = newNames;
    }

    if (Object.keys(update).length > 0) {
      update.updatedAt = now;
      await db.collection('spare_parts').updateOne({ _id: sp._id }, { $set: update });
      spCount++;
      process.stdout.write(`  ✓ ${String(sp.name).slice(0, 55)}\n`);
    }
  }
  console.log(`\n  ${spCount} spare parts updated`);

  // ── 3. HOMEPAGE SECTIONS ───────────────────────────────────────────────────
  console.log('\n=== Updating Homepage Sections ===\n');

  // Full rewrite of the technology pillars section
  await db.collection('homepage_sections').updateOne(
    { sectionKey: 'technology-pillars-korean' },
    {
      $set: {
        sectionKey:  'technology-pillars-india',
        headline:    'Made in India. Engineered for India\'s Toughest Conditions.',
        subheadline: 'Every component built for tropical heat, monsoon humidity, and daily professional use — from our Gurugram manufacturing plant.',
        bodyText:    '100X Circle designs, manufactures, and services all fogging machines from our facility in Gurugram, India. Atmanirbhar Bharat certified. MSME/UDYAM registered. GeM listed. Built for the demands of Indian public health and agricultural pest control — not imported, not re-labelled, genuinely Indian.',
        badge:       'Made in India',
        bullets: [
          'Manufactured in India — Gurugram Facility',
          'MSME / UDYAM Certified Indian Manufacturer',
          'ISO 9001:2015 Quality Certified',
          'GeM Registered — Direct Government Procurement',
          'DC 12V Auto-Start — Field-Proven Design',
          'Grade 316L Marine Stainless Steel',
          '8–15 Micron Ultra-Fine Fog Droplets',
          'WHO-Approved Chemical Compatibility',
          'Atmanirbhar Bharat — Indian-Made & Serviced',
          'Pan-India Spare Parts — 3-Day Delivery',
          '50+ Genuine OEM Spare Parts Always Stocked',
          'On-Site Training & After-Sales Support',
        ],
        updatedAt: now,
      },
    }
  );
  console.log('  ✓ technology-pillars section rewritten as Made in India');

  // Update celebrity solution section body text
  await db.collection('homepage_sections').updateMany(
    { bodyText: { $regex: /korean/i } },
    [{ $set: { bodyText: { $replaceAll: { input: '$bodyText', find: 'Korea-engineered', replacement: 'Made in India' } } } }]
  );
  await db.collection('homepage_sections').updateMany(
    { subheadline: { $regex: /korean/i } },
    [{ $set: { subheadline: { $replaceAll: { input: '$subheadline', find: 'Korea-engineered', replacement: 'Made in India' } } } }]
  );

  // Patch all sections' bullets for Korean refs
  const sections = await db.collection('homepage_sections').find({}).toArray();
  for (const s of sections) {
    if (!Array.isArray(s.bullets)) continue;
    const newBullets = s.bullets.map(patchText);
    if (JSON.stringify(newBullets) !== JSON.stringify(s.bullets)) {
      await db.collection('homepage_sections').updateOne({ _id: s._id }, { $set: { bullets: newBullets, updatedAt: now } });
      console.log(`  ✓ patched bullets in: ${s.sectionKey}`);
    }
  }

  // Full patchText on all section text fields
  for (const s of sections) {
    const update = {};
    for (const f of ['headline', 'subheadline', 'bodyText', 'badge', 'ctaText', 'ctaSecondaryText']) {
      if (typeof s[f] === 'string') {
        const p = patchText(s[f]);
        if (p !== s[f]) update[f] = p;
      }
    }
    if (Object.keys(update).length > 0) {
      update.updatedAt = now;
      await db.collection('homepage_sections').updateOne({ _id: s._id }, { $set: update });
      console.log(`  ✓ text patched: ${s.sectionKey}`);
    }
  }

  await client.close();
  console.log('\n=== All Done ===\n');
}

main().catch(e => { console.error(e); process.exit(1); });
