#!/usr/bin/env node
const path = require('node:path');
const { runVideoRemix } = require('../../shared/lib/video-remix');

const SKILL_ROOT = path.resolve(__dirname, '..');
const ANALYZE_SKILL_ROOT = path.resolve(SKILL_ROOT, '..', 'creatok:video-analyze');

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === '--tiktok_url') args.tiktokUrl = value;
    if (key === '--run_id') args.runId = value;
    if (key === '--angle') args.angle = value;
    if (key === '--brand') args.brand = value;
    if (key === '--style') args.style = value;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.tiktokUrl || !args.runId) {
    console.error('Usage: run.js --tiktok_url <url> --run_id <run_id> [--angle ...] [--brand ...] [--style ...]');
    process.exit(2);
  }

  const result = await runVideoRemix({
    tiktokUrl: args.tiktokUrl,
    runId: args.runId,
    skillDir: SKILL_ROOT,
    analyzeSkillDir: ANALYZE_SKILL_ROOT,
    angle: args.angle || null,
    brand: args.brand || null,
    style: args.style || null,
  });

  console.log(JSON.stringify({ ok: true, run_id: result.runId, artifacts_dir: result.artifactsDir }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
