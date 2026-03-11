const { artifactsForRun } = require('./artifacts');
const { defaultClient } = require('./creatok-client');

function buildGenerateResult({ runId, taskId, status, model = null, videoUrl = null, raw = null, error = null }) {
  return {
    run_id: runId,
    task_id: taskId ? String(taskId) : null,
    status,
    model,
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
  ratio = '9:16',
  model = 'veo-3.1-fast-exp',
  pollInterval = 3,
  timeoutSec = 600,
  client = defaultClient(),
}) {
  const artifacts = artifactsForRun(skillDir, runId);
  artifacts.ensure();

  const submit = await client.submitTask(prompt, ratio, model);
  const taskId = submit.task_id;
  if (!taskId) {
    throw new Error(`Missing task_id: ${JSON.stringify(submit)}`);
  }

  const initial = buildGenerateResult({
    runId,
    taskId: String(taskId),
    status: String(submit.status || 'submitted'),
    model,
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
  runGenerateVideo,
  runGenerateVideoStatus,
};
