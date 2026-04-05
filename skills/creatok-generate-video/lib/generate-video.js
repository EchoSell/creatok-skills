const { artifactsForRun } = require('./artifacts');
const { defaultClient } = require('./creatok-client');

const MODEL_LIMITS = {
  'doubao-seedance-2': {
    minDuration: 4,
    maxDuration: 15,
    resolutions: ['480p', '720p'],
    ratios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    maxReferenceImages: 5,
  },
  'doubao-seedance-2-fast': {
    minDuration: 4,
    maxDuration: 15,
    resolutions: ['480p', '720p'],
    ratios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    maxReferenceImages: 5,
  },
  'sora-2': { durations: [12], resolutions: ['720p'], ratios: ['9:16', '16:9'], maxReferenceImages: 1 },
  'veo-3.1-fast-exp': { maxDuration: 8, resolutions: ['720p'], maxReferenceImages: 3 },
  'veo-3.1-exp': { maxDuration: 8, resolutions: ['720p'], maxReferenceImages: 3 },
};

function defaultDurationForModel(model) {
  const limits = MODEL_LIMITS[model];
  if (!limits) {
    throw new Error(`Unsupported model: ${model}`);
  }
  if (limits.durations) return limits.durations[0];
  if (limits.defaultDuration) return limits.defaultDuration;
  return limits.maxDuration;
}

function defaultResolutionForModel(model) {
  const limits = MODEL_LIMITS[model];
  if (!limits) {
    throw new Error(`Unsupported model: ${model}`);
  }
  return limits.resolutions[0];
}

function validateParams({ model, orientation, seconds, definition, referenceImages = [] }) {
  const limits = MODEL_LIMITS[model];
  if (!limits) {
    throw new Error(`Unsupported model: ${model}. Supported: ${Object.keys(MODEL_LIMITS).join(', ')}`);
  }
  if (!limits.resolutions.includes(definition)) {
    throw new Error(`Model ${model} does not support definition ${definition}. Allowed: ${limits.resolutions.join(', ')}`);
  }
  if (limits.durations && !limits.durations.includes(seconds)) {
    throw new Error(`Model ${model} requires duration ${limits.durations.join(' or ')}s.`);
  }
  if (limits.minDuration && seconds < limits.minDuration) {
    throw new Error(`Model ${model} requires duration between ${limits.minDuration}s and ${limits.maxDuration}s.`);
  }
  if (limits.maxDuration && seconds > limits.maxDuration) {
    throw new Error(`Model ${model} supports max duration ${limits.maxDuration}s.`);
  }
  if (limits.ratios && !limits.ratios.includes(orientation)) {
    throw new Error(`Model ${model} does not support orientation ${orientation}. Allowed: ${limits.ratios.join(', ')}`);
  }
  if (referenceImages.length > limits.maxReferenceImages) {
    throw new Error(
      `Model ${model} supports at most ${limits.maxReferenceImages} reference image${limits.maxReferenceImages > 1 ? 's' : ''}.`,
    );
  }
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
  orientation = '9:16',
  model = 'veo-3.1-fast-exp',
  seconds = null,
  definition = null,
  referenceImages = [],
  pollInterval = 3,
  timeoutSec = 600,
  client = defaultClient(),
}) {
  const finalSeconds = seconds == null ? defaultDurationForModel(model) : Number(seconds);
  const finalDefinition = definition || defaultResolutionForModel(model);
  validateParams({
    model,
    orientation,
    seconds: finalSeconds,
    definition: finalDefinition,
    referenceImages,
  });
  const referenceImageKeys = await uploadReferenceImages(client, referenceImages, timeoutSec);

  const artifacts = artifactsForRun(skillDir, runId);
  artifacts.ensure();

  const submit = await client.submitTask({
    prompt,
    orientation,
    seconds: finalSeconds,
    definition: finalDefinition,
    model,
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
    model,
    orientation,
    seconds: finalSeconds,
    definition: finalDefinition,
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
      model,
      orientation,
      seconds: finalSeconds,
      definition: finalDefinition,
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
      model,
      orientation,
      seconds: finalSeconds,
      definition: finalDefinition,
      raw: { submit },
      error: { message: error instanceof Error ? error.message : String(error) },
    });
    persistGenerateArtifacts(artifacts, failed);
    throw error;
  }
}

module.exports = {
  buildGenerateResult,
  validateParams,
  persistGenerateArtifacts,
  pollGenerate,
  runGenerateVideo,
  runGenerateVideoStatus,
};
