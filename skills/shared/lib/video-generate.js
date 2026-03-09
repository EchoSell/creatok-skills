const { artifactsForRun } = require('./artifacts');
const { defaultClient } = require('./creatok-client');

async function pollGenerate(client, taskId, pollInterval = 3, timeoutSec = 600) {
  const startedAt = Date.now();
  let lastStatus = null;

  while (true) {
    if ((Date.now() - startedAt) / 1000 > timeoutSec) {
      throw new Error(`Timeout waiting for task ${taskId}`);
    }

    const statusPayload = await client.generateStatus(taskId);
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

async function runVideoGenerate({
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

  const submit = await client.generate(prompt, ratio, model);
  const taskId = submit.task_id;
  if (!taskId) {
    throw new Error(`Missing task_id: ${JSON.stringify(submit)}`);
  }

  const raw = await pollGenerate(client, String(taskId), pollInterval, timeoutSec);
  const status = String(raw.status || '');
  const videoUrl = raw.result && typeof raw.result === 'object' ? raw.result.video_url || null : null;

  const result = {
    run_id: runId,
    task_id: String(taskId),
    status,
    model,
    video_url: videoUrl,
    raw,
  };

  artifacts.writeJson('outputs/result.json', result);
  artifacts.writeText(
    'outputs/result.md',
    [
      '# Video Generate Result',
      '',
      `- run_id: \`${runId}\``,
      `- model: \`${model}\``,
      `- status: \`${status}\``,
      `- task_id: \`${taskId}\``,
      `- video_url: ${videoUrl || '(missing)'}`,
      '',
    ].join('\n'),
  );

  return {
    runId,
    artifactsDir: artifacts.root,
    taskId: String(taskId),
    status,
    videoUrl,
    raw,
  };
}

module.exports = {
  pollGenerate,
  runVideoGenerate,
};
