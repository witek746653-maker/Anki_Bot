const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const mdPath = path.join(root, 'prompts', 'system_prompt.md');
const outDir = path.join(root, 'prompts');
const outPath = path.join(outDir, 'prompt.js');

if (!fs.existsSync(mdPath)) {
  console.error('❌ Ошибка: system_prompt.md не найден по пути:', mdPath);
  process.exit(1);
}

const md = fs.readFileSync(mdPath, 'utf8');
const now = new Date();
const buildVersion = `${String(now.getUTCDate()).padStart(2, '0')}.${String(now.getUTCMonth() + 1).padStart(2, '0')} ${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')} UTC`;

// Экранируем обратные кавычки и знаки доллара для вставки в template literal
const safe = md.replace(/`/g, '\\`').replace(/\$/g, '\\$');

const js = `// Auto-generated from prompts/system_prompt.md — DO NOT EDIT
var SYSTEM_PROMPT = \`${safe}\`;
var BUILD_VERSION = "${buildVersion}";

if (typeof module !== 'undefined' && module.exports) {
  module.exports.SYSTEM_PROMPT = SYSTEM_PROMPT;
  module.exports.BUILD_VERSION = BUILD_VERSION;
}
`;

fs.writeFileSync(outPath, js, 'utf8');
console.log('✅ prompt.js успешно обновлен ->', outPath);
