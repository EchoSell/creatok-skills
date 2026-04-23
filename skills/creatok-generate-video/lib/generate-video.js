const { artifactsForRun } = require('./artifacts');
const { defaultClient } = require('./creatok-client');
const { buildUnsupportedVideoModelError, fetchVideoCapabilities, summarizeModelSelection } = require('./capabilities');
const { defaultCapabilitiesClient } = require('./creatok-capabilities-client');

function capabilitiesOptions(client, timeoutSec) {
  return {
    client: typeof client.getCapabilities === 'function' ? client : null,
    defaultClient: defaultCapabilitiesClient,
    timeoutSec,
  };
}

function parseDurationSeconds(seconds) {
  const parsed = Number(seconds);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    throw new Error('seconds must be a finite integer');
  }
  return parsed;
}

function validateDurations(model, durations, seconds) {
  if (durations.enum && !durations.enum.includes(seconds)) {
    throw new Error(`Model ${model} requires duration ${durations.enum.join(' or ')}s.`);
  }
  if (durations.min != null && durations.max != null && (seconds < durations.min || seconds > durations.max)) {
    throw new Error(`Model ${model} requires duration between ${durations.min}s and ${durations.max}s.`);
  }
  if (durations.min != null && durations.max == null && seconds < durations.min) {
    throw new Error(`Model ${model} requires duration at least ${durations.min}s.`);
  }
  if (durations.max != null && durations.min == null && seconds > durations.max) {
    throw new Error(`Model ${model} supports max duration ${durations.max}s.`);
  }
}

async function resolveGenerateVideoRequest({
  orientation = null,
  model = null,
  seconds = null,
  definition = null,
  referenceImages = [],
  timeoutSec = 600,
  client = defaultClient(),
}) {
  const videoCapabilities = await fetchVideoCapabilities(capabilitiesOptions(client, timeoutSec));
  const finalModel = model || videoCapabilities.defaultModel;
  const modelCapability = videoCapabilities.models.find((item) => item.id === finalModel);

  if (!modelCapability) {
    throw buildUnsupportedVideoModelError(videoCapabilities, finalModel);
  }

  const finalOrientation = orientation || modelCapability.defaults.orientation;
  const finalSeconds = seconds == null ? modelCapability.defaults.seconds : parseDurationSeconds(seconds);
  const finalDefinition = definition || modelCapability.defaults.definition;

  if (!modelCapability.limits.definitions.includes(finalDefinition)) {
    throw new Error(
      `Model ${finalModel} does not support definition ${finalDefinition}. Allowed: ${modelCapability.limits.definitions.join(', ')}`,
    );
  }
  validateDurations(finalModel, modelCapability.limits.durations, finalSeconds);
  if (!modelCapability.limits.orientations.includes(finalOrientation)) {
    throw new Error(
      `Model ${finalModel} does not support orientation ${finalOrientation}. Allowed: ${modelCapability.limits.orientations.join(', ')}`,
    );
  }
  if (referenceImages.length > modelCapability.limits.maxReferenceImages) {
    throw new Error(
      `Model ${finalModel} supports at most ${modelCapability.limits.maxReferenceImages} reference image${modelCapability.limits.maxReferenceImages > 1 ? 's' : ''}.`,
    );
  }

  const estimate =
    modelCapability.pricing &&
    modelCapability.pricing.estimates.find(
      (item) =>
        item.definition === finalDefinition &&
        item.seconds === finalSeconds &&
        item.orientation === finalOrientation,
    );
  const estimatedCredits = estimate ? estimate.credits : null;

  return {
    estimatedCredits,
    selectedModelSummary: summarizeModelSelection(modelCapability, { estimatedCredits }),
    selectionReason: model ? 'Model explicitly provided by caller.' : 'Using backend default model.',
    orientation: finalOrientation,
    model: finalModel,
    seconds: finalSeconds,
    definition: finalDefinition,
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

function buildGenerateResult({
  runId,
  taskId,
  status,
  model = null,
  orientation = null,
  seconds = null,
  definition = null,
  videoUrl = null,
  raw = null,
  error = null,
}) {
  return {
    run_id: runId,
    task_id: taskId ? String(taskId) : null,
    status,
    model,
    orientation,
    seconds,
    definition,
    video_url: videoUrl,
    raw,
    error,
  };
}

function persistGenerateArtifacts(artifacts, result, title = 'Video Generate Result') {
  artifacts.writeJson('outputs/result.json', result);
  artifacts.writeText(
    'outputs/result.md',
    [
      `# ${title}`,
      '',
      `- run_id: \`${result.run_id}\``,
      `- model: \`${result.model || '(unknown)'}\``,
      `- orientation: \`${result.orientation || '(unknown)'}\``,
      `- seconds: \`${result.seconds || '(unknown)'}\``,
      `- definition: \`${result.definition || '(unknown)'}\``,
      `- status: \`${result.status}\``,
      `- task_id: \`${result.task_id || '(missing)'}\``,
      `- video_url: ${result.video_url || '(missing)'}`,
      `- error: ${result.error && result.error.message ? result.error.message : '(none)'}`,
      '',
    ].join('\n'),
  );
}

async function pollGenerate(client, taskId, pollInterval = 3, timeoutSec = 600) {
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

async function runGenerateVideoStatus({
  taskId,
  runId,
  skillDir,
  model = null,
  wait = false,
  pollInterval = 3,
  timeoutSec = 600,
  client = defaultClient(),
}) {
  const artifacts = artifactsForRun(skillDir, runId);
  artifacts.ensure();

  const raw = wait
    ? await pollGenerate(client, String(taskId), pollInterval, timeoutSec)
    : await client.getTaskStatus(String(taskId));

  const status = String(raw.status || '');
  const videoUrl = raw.result && typeof raw.result === 'object' ? raw.result.video_url || null : null;
  const error =
    raw.error && typeof raw.error === 'object'
      ? { message: raw.error.message || String(raw.error) }
      : null;

  const result = buildGenerateResult({
    runId,
    taskId: String(taskId),
    status,
    model,
    videoUrl,
    raw,
    error,
  });

  persistGenerateArtifacts(artifacts, result, 'Task Status');

  return {
    runId,
    artifactsDir: artifacts.root,
    taskId: String(taskId),
    status,
    videoUrl,
    raw,
    error,
  };
}

async function runGenerateVideo({
  prompt,
  runId,
  skillDir,
  orientation = null,
  model = null,
  seconds = null,
  definition = null,
  referenceImages = [],
  pollInterval = 3,
  timeoutSec = 600,
  client = defaultClient(),
}) {
  const resolved = await resolveGenerateVideoRequest({
    orientation,
    seconds,
    definition,
    model,
    referenceImages,
    timeoutSec,
    client,
  });
  const referenceImageKeys = await uploadReferenceImages(client, referenceImages, timeoutSec);

  const artifacts = artifactsForRun(skillDir, runId);
  artifacts.ensure();

  const submit = await client.submitTask({
    prompt,
    orientation: resolved.orientation,
    seconds: resolved.seconds,
    definition: resolved.definition,
    model: resolved.model,
    ...(referenceImageKeys.length > 0 ? { referenceImageKeys } : {}),
  });
  const taskId = submit.task_id;
  if (!taskId) {
    throw new Error(`Missing task_id: ${JSON.stringify(submit)}`);
  }

  const initial = buildGenerateResult({
    runId,
    taskId: String(taskId),
    status: String(submit.status || 'submitted'),
    model: resolved.model,
    orientation: resolved.orientation,
    seconds: resolved.seconds,
    definition: resolved.definition,
    raw: { submit },
  });
  persistGenerateArtifacts(artifacts, initial);

  try {
    const raw = await pollGenerate(client, String(taskId), pollInterval, timeoutSec);
    const status = String(raw.status || '');
    const videoUrl =
      raw.result && typeof raw.result === 'object' ? raw.result.video_url || null : null;

    const result = buildGenerateResult({
      runId,
      taskId: String(taskId),
      status,
      model: resolved.model,
      orientation: resolved.orientation,
      seconds: resolved.seconds,
      definition: resolved.definition,
      videoUrl,
      raw: { submit, status: raw },
      error:
        raw.error && typeof raw.error === 'object'
          ? { message: raw.error.message || String(raw.error) }
          : null,
    });

    persistGenerateArtifacts(artifacts, result);

    return {
      runId,
      artifactsDir: artifacts.root,
      taskId: String(taskId),
      status,
      videoUrl,
      raw,
    };
  } catch (error) {
    const failed = buildGenerateResult({
      runId,
      taskId: String(taskId),
      status: String(submit.status || 'submitted'),
      model: resolved.model,
      orientation: resolved.orientation,
      seconds: resolved.seconds,
      definition: resolved.definition,
      raw: { submit },
      error: { message: error instanceof Error ? error.message : String(error) },
    });
    persistGenerateArtifacts(artifacts, failed);
    throw error;
  }
}

module.exports = {
  buildGenerateResult,
  persistGenerateArtifacts,
  pollGenerate,
  resolveGenerateVideoRequest,
  runGenerateVideo,
  runGenerateVideoStatus,
};
