const fs = require('node:fs');
const path = require('node:path');

function skillsRoot() {
  return path.resolve(__dirname, '..', '..');
}

function repoRoot() {
  return path.resolve(skillsRoot(), '..');
}

function loadLocalConfig() {
  const candidates = [
    path.join(skillsRoot(), 'config.local.json'),
    path.join(repoRoot(), 'config.local.json'),
  ];

  for (const configPath of candidates) {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  }

  return {};
}

function getCreatokConfig() {
  const cfg = loadLocalConfig().creatok || {};
  const baseUrl = process.env.CREATOK_BASE_URL || cfg.baseUrl || 'https://www.creatok.ai';
  const apiKey = process.env.CREATOK_API_KEY || cfg.apiKey;

  if (!apiKey) {
    throw new Error(
      'Missing CREATOK_API_KEY. Set env CREATOK_API_KEY or fill config.local.json: creatok.apiKey',
    );
  }

  return {
    baseUrl: String(baseUrl).replace(/\/$/, ''),
    openSkillsKey: String(apiKey),
  };
}

module.exports = {
  getCreatokConfig,
  loadLocalConfig,
  repoRoot,
  skillsRoot,
};
