const { execSync } = require('child_process');
const ver = new Date().toISOString().replace(/[:.]/g,'').slice(0,15) + 'Z';
function run(cmd){
  console.log('>', cmd);
  execSync(cmd, { stdio: 'inherit' });
}

try {
  run('node ./scripts/build_prompts.js');
  run('clasp pull');
  run('clasp push');
  run(`clasp version "deploy ${ver}"`);
  // Uncomment to auto-deploy the web app
  // run(`clasp deploy --description "deploy ${ver}"`);
} catch (e) {
  console.error('Deploy failed:', e.message);
  process.exit(1);
}
