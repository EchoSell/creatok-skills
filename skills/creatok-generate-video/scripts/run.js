#!/usr/bin/env node
const path = require('node:path');
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');
const { runGenerateVideo, runGenerateVideoStatus } = require('../lib/generate-video');

const SKILL_ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = {
    orientation: '9:16',
    model: 'veo-3.1-fast-exp',
    timeoutSec: 600,
    pollInterval: 3,
    yes: false,
    referenceImages: [],
  };

  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === '--yes') {
      args.yes = true;
      continue;
    }
    if (key === '--wait') {
      args.wait = true;
      continue;
    }

    const value = argv[i + 1];
    if (key === '--prompt') args.prompt = value;
    if (key === '--task_id') args.taskId = value;
    if (key === '--orientation') args.orientation = value;
    if (key === '--seconds') args.seconds = Number(value);
    if (key === '--definition') args.definition = value;
    if (key === '--reference_images') args.referenceImages = value.split(',').map((s) => s.trim());
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
  console.log(`- orientation: ${args.orientation}`);
  if (args.seconds != null) console.log(`- seconds: ${args.seconds}`);
  if (args.definition) console.log(`- definition: ${args.definition}`);
  if (args.referenceImages.length > 0) console.log(`- reference_images: ${args.referenceImages.join(', ')}`);
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
  if (!args.runId || (!args.prompt && !args.taskId)) {
    console.error('Usage: run.js --run_id <run_id> (--prompt <prompt> [--orientation 9:16] [--seconds 8] [--definition 720p] [--reference_images /abs/a.png,/abs/b.jpg] [--model veo-3.1-fast-exp|doubao-seedance-2|doubao-seedance-2-fast] [--yes] | --task_id <task_id> [--wait] [--model veo-3.1-fast-exp|doubao-seedance-2|doubao-seedance-2-fast])');
    process.exit(2);
  }

  if (args.taskId) {
    const result = await runGenerateVideoStatus({
      taskId: args.taskId,
      runId: args.runId,
      skillDir: SKILL_ROOT,
      model: args.model || null,
      wait: Boolean(args.wait),
      timeoutSec: args.timeoutSec,
      pollInterval: args.pollInterval,
    });

    console.log(JSON.stringify({ ok: true, run_id: result.runId, task_id: result.taskId, status: result.status, video_url: result.videoUrl }));
    process.exit(result.status === 'succeeded' ? 0 : 1);
  }

  if (!args.yes) {
    const confirmed = await confirmGeneration(args);
    if (!confirmed) {
      console.log('Canceled.');
      process.exit(2);
    }
  }

  const result = await runGenerateVideo({
    prompt: args.prompt,
    runId: args.runId,
    skillDir: SKILL_ROOT,
    orientation: args.orientation,
    seconds: args.seconds,
    definition: args.definition || null,
    referenceImages: args.referenceImages,
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
