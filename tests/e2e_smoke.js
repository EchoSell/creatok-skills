#!/usr/bin/env node
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SKILLS_ROOT = path.join(REPO_ROOT, 'skills');
const ANALYZE_SKILL_DIR = path.join(SKILLS_ROOT, 'creatok-analyze-video');
const REMIX_SKILL_DIR = path.join(SKILLS_ROOT, 'creatok-recreate-video');
const GENERATE_SKILL_DIR = path.join(SKILLS_ROOT, 'creatok-generate-video');

const { runAnalyzeVideo } = require('../skills/creatok-shared/lib/analyze-video');
const { runRecreateVideo } = require('../skills/creatok-shared/lib/recreate-video');
const { runGenerateVideo, runGenerateVideoStatus } = require('../skills/creatok-shared/lib/generate-video');

class FakeClient {
  async analyze() {
    return {
      session: { id: 101, uid: 'sess_demo_101' },
      video_uid: 'video_demo_123',
      video: {
        download_url: 'https://example.com/video.mp4',
        cover_url: 'https://example.com/cover.jpg',
        duration_sec: 12.4,
        expires_in_sec: 7200,
      },
      transcript: {
        segments: [
          { sequence: 1, start: 0.0, end: 1.8, content: 'Stop scrolling if your skin looks tired.' },
          { sequence: 2, start: 1.8, end: 5.0, content: 'Use one active and one hydrator to rebuild texture.' },
        ],
      },
      vision: {
        scenes: [{ sequence: 1, start: 0.0, end: 3.0, title: 'Talking head hook', shot_type: 'talking head' }],
      },
      response: {
        content: 'This video opens with a skincare hook and moves into routine guidance.',
        reasoning_content: null,
        suggestions: ['做一个更贴近原视频的复刻版', '换成敏感肌产品做二创'],
      },
    };
  }

  async submitTask() {
    return { task_id: 'task_demo_123' };
  }

  async getTaskStatus() {
    return {
      status: 'succeeded',
      result: { video_url: 'https://example.com/generated.mp4' },
    };
  }
}

function cleanup(paths) {
  for (const target of paths) {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

test('analyze-video writes expected artifacts', async () => {
  const runDir = path.join(ANALYZE_SKILL_DIR, '.artifacts', 'smoke-analyze');
  cleanup([runDir]);

  const result = await runAnalyzeVideo({
    tiktokUrl: 'https://www.tiktok.com/@demo/video/123',
    runId: 'smoke-analyze',
    skillDir: ANALYZE_SKILL_DIR,
    client: new FakeClient(),
  });

  assert.equal(fs.existsSync(path.join(result.artifactsDir, 'outputs', 'result.json')), true);
  assert.equal(fs.existsSync(path.join(result.artifactsDir, 'transcript', 'transcript.json')), true);
  assert.equal(fs.existsSync(path.join(result.artifactsDir, 'vision', 'vision.json')), true);

  const payload = JSON.parse(fs.readFileSync(path.join(result.artifactsDir, 'outputs', 'result.json'), 'utf8'));
  assert.equal(payload.skill, 'creatok-analyze-video');
  assert.equal(payload.platform, 'tiktok');
  assert.ok(payload.transcript.segments_count >= 1);
  cleanup([runDir]);
});

test('recreate-video writes recreate_source only', async () => {
  const runDir = path.join(REMIX_SKILL_DIR, '.artifacts', 'smoke-recreate');
  cleanup([runDir]);

  const result = await runRecreateVideo({
    tiktokUrl: 'https://www.tiktok.com/@demo/video/456',
    runId: 'smoke-recreate',
    skillDir: REMIX_SKILL_DIR,
    analyzeSkillDir: ANALYZE_SKILL_DIR,
    analyzeRunner: async () => ({
      runId: 'smoke-recreate--analyze',
      artifactsDir: path.join(ANALYZE_SKILL_DIR, '.artifacts', 'smoke-recreate--analyze'),
      result: {
        video: { tiktok_url: 'https://www.tiktok.com/@demo/video/456' },
        transcript: { segments: [{ start: 0.0, end: 1.0, text: 'Hook line' }] },
      },
    }),
  });

  const recreateSourcePath = path.join(result.artifactsDir, 'outputs', 'recreate_source.json');
  assert.equal(fs.existsSync(recreateSourcePath), true);
  const recreateSource = JSON.parse(fs.readFileSync(recreateSourcePath, 'utf8'));
  assert.equal(recreateSource.reference.tiktok_url, 'https://www.tiktok.com/@demo/video/456');
  assert.ok(recreateSource.analyze_result);
  cleanup([runDir]);
});

test('generate-video returns final url and writes artifacts', async () => {
  const runDir = path.join(GENERATE_SKILL_DIR, '.artifacts', 'smoke-generate');
  cleanup([runDir]);

  const result = await runGenerateVideo({
    prompt: 'A short TikTok-style demo video',
    runId: 'smoke-generate',
    skillDir: GENERATE_SKILL_DIR,
    ratio: '9:16',
    client: new FakeClient(),
    pollInterval: 0.01,
    timeoutSec: 1,
  });

  assert.equal(result.status, 'succeeded');
  assert.equal(result.videoUrl, 'https://example.com/generated.mp4');
  assert.equal(fs.existsSync(path.join(result.artifactsDir, 'outputs', 'result.json')), true);
  const payload = JSON.parse(fs.readFileSync(path.join(result.artifactsDir, 'outputs', 'result.json'), 'utf8'));
  assert.equal(payload.task_id, 'task_demo_123');
  cleanup([runDir]);
});

test('generate-video persists task id even when polling fails', async () => {
  const runDir = path.join(GENERATE_SKILL_DIR, '.artifacts', 'smoke-generate-error');
  cleanup([runDir]);

  class FailingStatusClient extends FakeClient {
    async getTaskStatus() {
      throw new Error('Temporary network error');
    }
  }

  await assert.rejects(
    () =>
      runGenerateVideo({
        prompt: 'A short TikTok-style demo video',
        runId: 'smoke-generate-error',
        skillDir: GENERATE_SKILL_DIR,
        ratio: '9:16',
        client: new FailingStatusClient(),
        pollInterval: 0.01,
        timeoutSec: 1,
      }),
    /Temporary network error/,
  );

  const payload = JSON.parse(fs.readFileSync(path.join(runDir, 'outputs', 'result.json'), 'utf8'));
  assert.equal(payload.task_id, 'task_demo_123');
  assert.equal(payload.status, 'submitted');
  assert.equal(payload.error.message, 'Temporary network error');
  cleanup([runDir]);
});

test('generate-video can query existing task id', async () => {
  const runDir = path.join(GENERATE_SKILL_DIR, '.artifacts', 'smoke-status');
  cleanup([runDir]);

  const result = await runGenerateVideoStatus({
    taskId: 'task_demo_123',
    runId: 'smoke-status',
    skillDir: GENERATE_SKILL_DIR,
    client: new FakeClient(),
  });

  assert.equal(result.status, 'succeeded');
  assert.equal(result.videoUrl, 'https://example.com/generated.mp4');
  assert.equal(fs.existsSync(path.join(result.artifactsDir, 'outputs', 'result.json')), true);
  cleanup([runDir]);
});
