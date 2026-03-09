#!/usr/bin/env node
const path = require('node:path');
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');
const { runVideoGenerate } = require('../../shared/lib/video-generate');

const SKILL_ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = {
    ratio: '9:16',
    model: 'veo-3.1-fast-exp',
    timeoutSec: 600,
    pollInterval: 3,
    yes: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === '--yes') {
      args.yes = true;
      continue;
    }

    const value = argv[i + 1];
    if (key === '--prompt') args.prompt = value;
    if (key === '--ratio') args.ratio = value;
    if (key === '--model') args.model = value;
    if (key === '--run_id') args.runId = value;
    if (key === '--timeout_sec') args.timeoutSec = Number(value);
    if (key === '--poll_interval') args.pollInterval = Number(value);
    if (key.startsWith('--')) {
      i += 1;
    }
  }
  return args;
}

async function confirmGeneration(args) {
  console.log('About to generate video via CreatOK Open Skills proxy.');
  console.log(`- model: ${args.model}`);
  console.log(`- ratio: ${args.ratio}`);
  console.log(`- prompt (first 120 chars): ${String(args.prompt).slice(0, 120)}`);
  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    const answer = (await rl.question('Confirm to start generation? (yes/no): ')).trim().toLowerCase();
    return answer === 'y' || answer === 'yes';
  } finally {
    rl.close();
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.prompt || !args.runId) {
    console.error('Usage: run.js --prompt <prompt> --run_id <run_id> [--ratio 9:16] [--model veo-3.1-fast-exp] [--yes]');
    process.exit(2);
  }

  if (!args.yes) {
    const confirmed = await confirmGeneration(args);
    if (!confirmed) {
      console.log('Canceled.');
      process.exit(2);
    }
  }

  const result = await runVideoGenerate({
    prompt: args.prompt,
    runId: args.runId,
    skillDir: SKILL_ROOT,
    ratio: args.ratio,
    model: args.model,
    timeoutSec: args.timeoutSec,
    pollInterval: args.pollInterval,
  });

  console.log(JSON.stringify({ ok: true, run_id: result.runId, video_url: result.videoUrl }));
  process.exit(result.status === 'succeeded' && result.videoUrl ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
