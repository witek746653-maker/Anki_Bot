const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ver = new Date().toISOString().replace(/[:.]/g,'').slice(0,15) + 'Z';
const localConfigPath = path.join(__dirname, '..', 'deploy.local.json');
function run(cmd){
  console.log('>', cmd);
  execSync(cmd, { stdio: 'inherit' });
}

function runCapture(cmd) {
  console.log('>', cmd);
  return execSync(cmd, { encoding: 'utf8' });
}

function getDeploymentId() {
  if (process.env.GAS_DEPLOYMENT_ID) {
    return process.env.GAS_DEPLOYMENT_ID;
  }

  if (!fs.existsSync(localConfigPath)) {
    return '';
  }

  const raw = fs.readFileSync(localConfigPath, 'utf8');
  const config = JSON.parse(raw);
  return config.deploymentId || '';
}

try {
  const deploymentId = getDeploymentId();

  run('node ./scripts/build_prompts.js');
  run('clasp push');

  if (!deploymentId) {
    console.log('Deployment ID is not set. Files were pushed, but web app deployment was not updated.');
    console.log('Add GAS_DEPLOYMENT_ID or create deploy.local.json with {"deploymentId":"..."} to enable automatic redeploy.');
    process.exit(0);
  }

  const versionOutput = runCapture(`clasp version "deploy ${ver}"`);
  const versionMatch = versionOutput.match(/Created version (\d+)\./i);

  if (!versionMatch) {
    throw new Error(`Could not parse version number from output: ${versionOutput}`);
  }

  const versionNumber = versionMatch[1];
  run(`clasp deploy -i ${deploymentId} -V ${versionNumber} -d "deploy ${ver}"`);
} catch (e) {
  console.error('Deploy failed:', e.message);
  process.exit(1);
}