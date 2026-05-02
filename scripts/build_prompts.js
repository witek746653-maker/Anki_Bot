const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const mdPath = path.join(root, 'prompts', 'system_prompt.md');
const outDir = path.join(root, 'prompts');
const outPath = path.join(outDir, 'prompt.js');

if (!fs.existsSync(mdPath)) {
  console.error('system_prompt.md not found at', mdPath);
  process.exit(1);
}

const md = fs.readFileSync(mdPath, 'utf8');

// Escape backticks to safely embed in template literal
const safe = md.replace(/`/g, '\\`');

const js = `// Auto-generated from prompts/system_prompt.md — DO NOT EDIT (edit the .md instead)
var SYSTEM_PROMPT = ` + '`' + `${safe}` + '`' + `;

// Export for Node-based tests (optional)
if (typeof module !== 'undefined' && module.exports) module.exports.SYSTEM_PROMPT = SYSTEM_PROMPT;
`;

fs.writeFileSync(outPath, js, 'utf8');
console.log('Written prompt.js ->', outPath);
