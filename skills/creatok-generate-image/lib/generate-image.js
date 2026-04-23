const { artifactsForRun } = require('./artifacts');
const { defaultClient } = require('./creatok-client');
const { buildUnsupportedImageModelError, fetchImageCapabilities, summarizeModelSelection } = require('./capabilities');
const { defaultCapabilitiesClient } = require('./creatok-capabilities-client');

function capabilitiesOptions(client, timeoutSec) {
  return {
    client: typeof client.getCapabilities === 'function' ? client : null,
    defaultClient: defaultCapabilitiesClient,
    timeoutSec,
  };
}

function parseImageCount(n) {
  const parsed = Number(n);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    throw new Error('n must be a finite integer');
  }
  return parsed;
}

async function resolveGenerateImageRequest({
  model = null,
  resolution = null,
  n = null,
  referenceImages = [],
  timeoutSec = 300,
  client = defaultClient(),
}) {
  const imageCapabilities = await fetchImageCapabilities(capabilitiesOptions(client, timeoutSec));
  const finalModel = model || imageCapabilities.defaultModel;
  const modelCapability = imageCapabilities.models.find((item) => item.id === finalModel);

  if (!modelCapability) {
    throw buildUnsupportedImageModelError(imageCapabilities, finalModel);
  }

  const finalResolution = resolution || modelCapability.defaults.resolution;
  const finalN = n == null ? modelCapability.defaults.n : parseImageCount(n);

  if (!modelCapability.limits.resolutions.includes(finalResolution)) {
    throw new Error(
      `Model ${finalModel} does not support resolution ${finalResolution}. Allowed: ${modelCapability.limits.resolutions.join(', ')}`,
    );
  }
  if (finalN < modelCapability.limits.n.min || finalN > modelCapability.limits.n.max) {
    throw new Error(`n must be between ${modelCapability.limits.n.min} and ${modelCapability.limits.n.max}`);
  }
  if (referenceImages.length > modelCapability.limits.maxReferenceImages) {
    throw new Error(`Maximum ${modelCapability.limits.maxReferenceImages} reference images allowed`);
  }

  const estimatedCreditsPerImage =
    modelCapability.pricing && Object.prototype.hasOwnProperty.call(modelCapability.pricing.byResolution, finalResolution)
      ? modelCapability.pricing.byResolution[finalResolution]
      : null;
  const estimatedCredits = estimatedCreditsPerImage == null ? null : estimatedCreditsPerImage * finalN;

  return {
    estimatedCredits,
    selectedModelSummary: summarizeModelSelection(modelCapability, { estimatedCredits }),
    selectionReason: model ? 'Model explicitly provided by caller.' : 'Using backend default model.',
    model: finalModel,
    resolution: finalResolution,
    n: finalN,
  };
}

async function uploadReferenceImages(client, referenceImages, timeoutSec) {
  if (!referenceImages || referenceImages.length === 0) return [];
  const uploadedKeys = [];
  for (const filePath of referenceImages) {
    const key = await client.uploadImageFile(filePath, {
      prefix: 'open-skills/reference-images',
      timeoutSec,
    });
    uploadedKeys.push(key);
  }
  return uploadedKeys;
}

function buildImageResult({
  runId,
  taskId,
  status,
  model,
  resolution,
  n,
  images = null,
  raw = null,
  error = null,
}) {
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
  model = null,
  resolution = null,
  n = null,
  aspectRatio = null,
  referenceImages = [],
  pollInterval = 3,
  timeoutSec = 300,
  client = defaultClient(),
}) {
  const resolved = await resolveGenerateImageRequest({
    model,
    resolution,
    n,
    referenceImages,
    timeoutSec,
    client,
  });

  const imageObjectKeys = await uploadReferenceImages(client, referenceImages, timeoutSec);

  const artifacts = artifactsForRun(skillDir, runId);
  artifacts.ensure();

  const submit = await client.submitImageTask({
    prompt,
    model: resolved.model,
    resolution: resolved.resolution,
    n: resolved.n,
    aspectRatio,
    ...(imageObjectKeys.length > 0 ? { referenceImages: imageObjectKeys } : {}),
  });
  const taskId = submit.task_id;
  if (!taskId) {
    throw new Error(`Missing task_id: ${JSON.stringify(submit)}`);
  }

  const initial = buildImageResult({
    runId,
    taskId: String(taskId),
    status: String(submit.status || 'submitted'),
    model: resolved.model,
    resolution: resolved.resolution,
    n: resolved.n,
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
      model: resolved.model,
      resolution: resolved.resolution,
      n: resolved.n,
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
      model: resolved.model,
      resolution: resolved.resolution,
      n: resolved.n,
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
  resolveGenerateImageRequest,
  runGenerateImage,
  runGenerateImageStatus,
};
