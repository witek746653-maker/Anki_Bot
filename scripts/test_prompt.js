const fs = require('fs');
const path = require('path');

const mdPath = path.join(__dirname, '..', 'prompts', 'system_prompt.md');
if (!fs.existsSync(mdPath)) {
  console.error('system_prompt.md not found');
  process.exit(2);
}
const txt = fs.readFileSync(mdPath, 'utf8');

const checks = [
  'СТРОГИЕ ПРАВИЛА',
  'Note Type',
  'Front/Question',
  'Back/Answer',
  'Hint',
  'A2',
  'B1',
  'TARGET CHUNK INVARIANT',
  'TYPE CONTRACTS',
  'ПРАВИЛА ПРИ СМЕНЕ NOTE TYPE',
  'Back/Answer ОБЯЗАН быть точной копией targetChunk'
];

let failed = [];
for (const c of checks) {
  if (!txt.includes(c)) failed.push(c);
}

if (failed.length) {
  console.error('Prompt validation failed, missing tokens:', failed);
  process.exit(1);
}
console.log('Prompt validation passed.');
