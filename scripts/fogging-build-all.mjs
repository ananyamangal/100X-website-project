// fogging-build-all.mjs
// Phase 1A Orchestrator — runs all four build scripts in sequence
//
// Usage:
//   node scripts/fogging-build-all.mjs            # full build
//   node scripts/fogging-build-all.mjs --from=2   # start from step 2
//   node scripts/fogging-build-all.mjs --only=3   # run only step 3

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CLI = {};
for (const a of process.argv.slice(2)) {
  if (a.startsWith('--')) { const [k, v] = a.slice(2).split('='); CLI[k] = v ?? true; }
}

const FROM = parseInt(CLI.from || '1');
const ONLY = CLI.only ? parseInt(CLI.only) : null;

const STEPS = [
  { n: 1, name: 'fogging_contracts',  script: 'fogging-01-build-contracts.mjs' },
  { n: 2, name: 'fogging_buyers',     script: 'fogging-02-build-buyers.mjs'    },
  { n: 3, name: 'fogging_oems',       script: 'fogging-03-build-oems.mjs'      },
  { n: 4, name: 'fogging_models',     script: 'fogging-04-build-models.mjs'    },
];

const steps = STEPS.filter(s => ONLY ? s.n === ONLY : s.n >= FROM);

console.log('╔' + '═'.repeat(60) + '╗');
console.log('║  Fogging Intelligence — Phase 1A Build Pipeline           ║');
console.log('╚' + '═'.repeat(60) + '╝');
console.log(`  Running steps: ${steps.map(s => s.n).join(', ')}\n`);

const t0 = Date.now();

for (const step of steps) {
  const start = Date.now();
  console.log(`\n┌─ Step ${step.n}: ${step.name}`);
  const scriptPath = path.join(__dirname, step.script);
  try {
    execSync(`node "${scriptPath}"`, { stdio: 'inherit' });
    console.log(`└─ ✓ Done in ${((Date.now() - start) / 1000).toFixed(1)}s`);
  } catch (e) {
    console.error(`└─ ✗ FAILED at step ${step.n}: ${e.message}`);
    process.exit(1);
  }
}

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.log('\n' + '═'.repeat(62));
console.log(`  ✓ All steps complete in ${elapsed}s`);
console.log('  Collections ready:');
steps.forEach(s => console.log(`    • ${s.name}`));
console.log('═'.repeat(62) + '\n');
