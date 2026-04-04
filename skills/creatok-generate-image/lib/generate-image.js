const { artifactsForRun } = require('./artifacts');
const { defaultClient } = require('./creatok-client');

const SUPPORTED_MODELS = ['seedream-5.0-lite', 'nano-banana-pro', 'nano-banana-2'];
const DEFAULT_MODEL = 'nano-banana-2';
const DEFAULT_RESOLUTION = '2K';
const DEFAULT_N = 1;

// Seedream models only support 2K/4K
const MODEL_RESOLUTIONS = {
  'seedream-5.0-lite': ['2K', '4K'],
  'nano-banana-pro': ['1K', '2K', '4K'],
  'nano-banana-2': ['1K', '2K', '4K'],
};

function validateParams({ model, resolution, n, referenceImages }) {
  if (!SUPPORTED_MODELS.includes(model)) {
    throw new Error(`Unsupported model: ${model}. Supported: ${SUPPORTED_MODELS.join(', ')}`);
  }
  const allowed = MODEL_RESOLUTIONS[model];
  if (!allowed.includes(resolution)) {
    throw new Error(`Model ${model} does not support resolution ${resolution}. Allowed: ${allowed.join(', ')}`);
  }
  if (n < 1 || n > 4) {
    throw new Error('n must be between 1 and 4');
  }
  if (referenceImages && referenceImages.length > 5) {
    throw new Error('Maximum 5 reference images allowed');
  }
}

function buildImageResult({ runId, taskId, status, model, resolution, n, images = null, raw = null, error = null }) {
  return {
    run_id: runId,
    task_id: taskId ? String(taskId) : null,
    status,
    model,
    resolution,
    n,
    images,
    raw,
    error,
  };
}

function persistImageArtifacts(artifacts, result, title = 'Image Generate Result') {
  artifacts.writeJson('outputs/result.json', result);
  const imageLines = (result.images || []).map((img, i) => `- image_${i + 1}: ${img.url || img.object_key || '(pending)'}`);
  artifacts.writeText(
    'outputs/result.md',
    [
      `# ${title}`,
      '',
      `- run_id: \`${result.run_id}\``,
      `- model: \`${result.model || '(unknown)'}\``,
      `- resolution: \`${result.resolution || '(unknown)'}\``,
      `- n: \`${result.n}\``,
      `- status: \`${result.status}\``,
      `- task_id: \`${result.task_id || '(missing)'}\``,
      `- error: ${result.error && result.error.message ? result.error.message : '(none)'}`,
      '',
      ...(imageLines.length ? ['## Images', '', ...imageLines, ''] : []),
    ].join('\n'),
  );
}

// Identical polling logic to generate-video — reuses same task status endpoint
async function pollGenerate(client, taskId, pollInterval = 3, timeoutSec = 300) {
  const startedAt = Date.now();
  let lastStatus = null;

  while (true) {
    if ((Date.now() - startedAt) / 1000 > timeoutSec) {
      throw new Error(`Timeout waiting for task ${taskId}`);
    }

    const statusPayload = await client.getTaskStatus(taskId);
    const status = String(statusPayload.status || '');
    if (status !== lastStatus) {
      console.log(JSON.stringify({ task_id: taskId, status }));
      lastStatus = status;
    }

    if (status === 'succeeded' || status === 'failed') {
      return statusPayload;
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval * 1000));
  }
}

function extractImages(raw) {
  if (!raw || !raw.result) return null;
  return Array.isArray(raw.result.images) ? raw.result.images : null;
}

async function runGenerateImageStatus({
  taskId,
  runId,
  skillDir,
  model = null,
  resolution = null,
  n = null,
  wait = false,
  pollInterval = 3,
  timeoutSec = 300,
  client = defaultClient(),
}) {
  const artifacts = artifactsForRun(skillDir, runId);
  artifacts.ensure();

  const raw = wait
    ? await pollGenerate(client, String(taskId), pollInterval, timeoutSec)
    : await client.getTaskStatus(String(taskId));

  const status = String(raw.status || '');
  const images = extractImages(raw);
  const error =
    raw.error && typeof raw.error === 'object'
      ? { message: raw.error.message || String(raw.error) }
      : null;

  const result = buildImageResult({
    runId,
    taskId: String(taskId),
    status,
    model,
    resolution,
    n,
    images,
    raw,
    error,
  });

  persistImageArtifacts(artifacts, result, 'Task Status');

  return {
    runId,
    artifactsDir: artifacts.root,
    taskId: String(taskId),
    status,
    images,
    raw,
    error,
  };
}

async function runGenerateImage({
  prompt,
  runId,
  skillDir,
  model = DEFAULT_MODEL,
  resolution = DEFAULT_RESOLUTION,
  n = DEFAULT_N,
  aspectRatio = null,
  referenceImages = [],
  pollInterval = 3,
  timeoutSec = 300,
  client = defaultClient(),
}) {
  validateParams({ model, resolution, n, referenceImages });

  const artifacts = artifactsForRun(skillDir, runId);
  artifacts.ensure();

  const submit = await client.submitImageTask({ prompt, model, resolution, n, aspectRatio, referenceImages });
  const taskId = submit.task_id;
  if (!taskId) {
    throw new Error(`Missing task_id: ${JSON.stringify(submit)}`);
  }

  const initial = buildImageResult({
    runId,
    taskId: String(taskId),
    status: String(submit.status || 'submitted'),
    model,
    resolution,
    n,
    raw: { submit },
  });
  persistImageArtifacts(artifacts, initial);

  try {
    const raw = await pollGenerate(client, String(taskId), pollInterval, timeoutSec);
    const status = String(raw.status || '');
    const images = extractImages(raw);

    const result = buildImageResult({
      runId,
      taskId: String(taskId),
      status,
      model,
      resolution,
      n,
      images,
      raw: { submit, status: raw },
      error:
        raw.error && typeof raw.error === 'object'
          ? { message: raw.error.message || String(raw.error) }
          : null,
    });

    persistImageArtifacts(artifacts, result);

    return {
      runId,
      artifactsDir: artifacts.root,
      taskId: String(taskId),
      status,
      images,
      raw,
    };
  } catch (error) {
    const failed = buildImageResult({
      runId,
      taskId: String(taskId),
      status: String(submit.status || 'submitted'),
      model,
      resolution,
      n,
      raw: { submit },
      error: { message: error instanceof Error ? error.message : String(error) },
    });
    persistImageArtifacts(artifacts, failed);
    throw error;
  }
}

module.exports = {
  buildImageResult,
  persistImageArtifacts,
  pollGenerate,
  runGenerateImage,
  runGenerateImageStatus,
};
