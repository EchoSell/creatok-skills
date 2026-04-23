#!/usr/bin/env node
const path = require('node:path');
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');
const { resolveGenerateImageRequest, runGenerateImage, runGenerateImageStatus } = require('../lib/generate-image');

const SKILL_ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = {
    timeoutSec: 300,
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
    if (key === '--model') args.model = value;
    if (key === '--resolution') args.resolution = value;
    if (key === '--n') args.n = Number(value);
    if (key === '--aspect_ratio') args.aspectRatio = value;
    if (key === '--reference_images') args.referenceImages = value.split(',').map((s) => s.trim());
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
  console.log('About to generate image via CreatOK Open Skills proxy.');
  console.log(`- model: ${args.model}`);
  console.log(`- model_summary: ${args.selectedModelSummary}`);
  console.log(`- model_selection_reason: ${args.selectionReason}`);
  if (args.estimatedCredits != null) console.log(`- estimated_credits: ${args.estimatedCredits}`);
  console.log(`- resolution: ${args.resolution}`);
  console.log(`- n: ${args.n}`);
  if (args.aspectRatio) console.log(`- aspect_ratio: ${args.aspectRatio}`);
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

async function resolveCommandArgs(args) {
  const resolved = await resolveGenerateImageRequest({
    model: args.model || null,
    resolution: args.resolution || null,
    n: args.n == null ? null : args.n,
    referenceImages: args.referenceImages,
    timeoutSec: args.timeoutSec,
  });

  return {
    ...args,
    model: resolved.model,
    resolution: resolved.resolution,
    n: resolved.n,
    estimatedCredits: resolved.estimatedCredits,
    selectedModelSummary: resolved.selectedModelSummary,
    selectionReason: resolved.selectionReason,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.runId || (!args.prompt && !args.taskId)) {
    console.error(
      'Usage: run.js --run_id <run_id> (--prompt <prompt> [--model <model_id>] [--resolution <resolution>] [--n <count>] [--aspect_ratio W:H] [--reference_images /abs/a.png,/abs/b.jpg] [--yes] | --task_id <task_id> [--wait])',
    );
    process.exit(2);
  }

  if (args.taskId) {
    const result = await runGenerateImageStatus({
      taskId: args.taskId,
      runId: args.runId,
      skillDir: SKILL_ROOT,
      model: args.model || null,
      resolution: args.resolution || null,
      n: args.n || null,
      wait: Boolean(args.wait),
      timeoutSec: args.timeoutSec,
      pollInterval: args.pollInterval,
    });

    console.log(
      JSON.stringify({ ok: true, run_id: result.runId, task_id: result.taskId, status: result.status, images: result.images }),
    );
    process.exit(result.status === 'succeeded' ? 0 : 1);
  }

  const resolvedArgs = await resolveCommandArgs(args);

  if (!resolvedArgs.yes) {
    const confirmed = await confirmGeneration(resolvedArgs);
    if (!confirmed) {
      console.log('Canceled.');
      process.exit(2);
    }
  }

  const result = await runGenerateImage({
    prompt: resolvedArgs.prompt,
    runId: resolvedArgs.runId,
    skillDir: SKILL_ROOT,
    model: resolvedArgs.model,
    resolution: resolvedArgs.resolution,
    n: resolvedArgs.n,
    aspectRatio: resolvedArgs.aspectRatio || null,
    referenceImages: resolvedArgs.referenceImages,
    timeoutSec: resolvedArgs.timeoutSec,
    pollInterval: resolvedArgs.pollInterval,
  });

  console.log(JSON.stringify({ ok: true, run_id: result.runId, task_id: result.taskId, images: result.images }));
  process.exit(result.status === 'succeeded' && result.images ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
