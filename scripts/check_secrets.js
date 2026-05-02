const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const filesToScan = [
  'Код.js',
  'Archive.js',
  '.clasp.json',
  'scripts/deploy.js'
];

const patterns = [
  /sk-[A-Za-z0-9_-]{20,}/g, // simple OpenAI key pattern
  /\b\d{8,}:AA[0-9A-Za-z_-]{30,}\b/g, // telegram bot token
  /17IgbkPi[A-Za-z0-9_-]{10,}/g // example sheet id (heuristic)
];

let found = false;
for (const f of filesToScan) {
  const p = path.join(repoRoot, f);
  if (!fs.existsSync(p)) continue;
  const content = fs.readFileSync(p, 'utf8');
  for (const re of patterns) {
    const m = content.match(re);
    if (m) {
      console.error(`Possible secret in ${f}:`, m.slice(0,3));
      found = true;
    }
  }
}

if (found) process.exit(1);
console.log('Secrets check passed.');
