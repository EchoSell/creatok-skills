#!/usr/bin/env node
const path = require('node:path');
const { runTaskStatus } = require('../../shared/lib/video-generate');

const SKILL_ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = {
    wait: false,
    timeoutSec: 600,
    pollInterval: 3,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === '--wait') {
      args.wait = true;
      continue;
    }

    const value = argv[i + 1];
    if (key === '--task_id') args.taskId = value;
    if (key === '--run_id') args.runId = value;
    if (key === '--model') args.model = value;
    if (key === '--timeout_sec') args.timeoutSec = Number(value);
    if (key === '--poll_interval') args.pollInterval = Number(value);
    if (key.startsWith('--')) {
      i += 1;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.taskId || !args.runId) {
    console.error('Usage: run.js --task_id <task_id> --run_id <run_id> [--model veo-3.1-fast-exp] [--wait]');
    process.exit(2);
  }

  const result = await runTaskStatus({
    taskId: args.taskId,
    runId: args.runId,
    skillDir: SKILL_ROOT,
    model: args.model || null,
    wait: args.wait,
    timeoutSec: args.timeoutSec,
    pollInterval: args.pollInterval,
  });

  console.log(JSON.stringify({ ok: true, run_id: result.runId, task_id: result.taskId, status: result.status, video_url: result.videoUrl }));
  process.exit(result.status === 'succeeded' ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
