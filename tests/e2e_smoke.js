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
const IMAGE_SKILL_DIR = path.join(SKILLS_ROOT, 'creatok-generate-image');

const { runAnalyzeVideo } = require('../skills/creatok-analyze-video/lib/analyze-video');
const { runRecreateVideo } = require('../skills/creatok-recreate-video/lib/recreate-video');
const { runGenerateVideo, runGenerateVideoStatus } = require('../skills/creatok-generate-video/lib/generate-video');
const { runGenerateImage, runGenerateImageStatus } = require('../skills/creatok-generate-image/lib/generate-image');

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

class FakeImageClient {
  async submitImageTask() {
    return { task_id: 'img_task_demo_456' };
  }

  async getTaskStatus() {
    return {
      status: 'succeeded',
      result: {
        images: [
          { url: 'https://example.com/image1.png', thumbnail_url: 'https://example.com/image1_thumb.png' },
          { url: 'https://example.com/image2.png', thumbnail_url: 'https://example.com/image2_thumb.png' },
        ],
      },
    };
  }
}

test('generate-image returns images and writes artifacts', async () => {
  const runDir = path.join(IMAGE_SKILL_DIR, '.artifacts', 'smoke-image');
  cleanup([runDir]);

  const result = await runGenerateImage({
    prompt: 'A product photo of a skincare bottle on white background',
    runId: 'smoke-image',
    skillDir: IMAGE_SKILL_DIR,
    model: 'nano-banana-pro',
    resolution: '2K',
    n: 2,
    client: new FakeImageClient(),
    pollInterval: 0.01,
    timeoutSec: 1,
  });

  assert.equal(result.status, 'succeeded');
  assert.equal(result.images.length, 2);
  assert.equal(result.images[0].url, 'https://example.com/image1.png');

  const resultPath = path.join(result.artifactsDir, 'outputs', 'result.json');
  assert.equal(fs.existsSync(resultPath), true);
  const payload = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
  assert.equal(payload.task_id, 'img_task_demo_456');
  assert.equal(payload.model, 'nano-banana-pro');
  assert.equal(payload.resolution, '2K');
  assert.equal(payload.n, 2);

  assert.equal(fs.existsSync(path.join(result.artifactsDir, 'outputs', 'result.md')), true);
  cleanup([runDir]);
});

test('generate-image persists task id even when polling fails', async () => {
  const runDir = path.join(IMAGE_SKILL_DIR, '.artifacts', 'smoke-image-error');
  cleanup([runDir]);

  class FailingImageStatusClient extends FakeImageClient {
    async getTaskStatus() {
      throw new Error('Temporary network error');
    }
  }

  await assert.rejects(
    () =>
      runGenerateImage({
        prompt: 'A product photo',
        runId: 'smoke-image-error',
        skillDir: IMAGE_SKILL_DIR,
        model: 'nano-banana-pro',
        resolution: '2K',
        n: 1,
        client: new FailingImageStatusClient(),
        pollInterval: 0.01,
        timeoutSec: 1,
      }),
    /Temporary network error/,
  );

  const payload = JSON.parse(
    fs.readFileSync(path.join(runDir, 'outputs', 'result.json'), 'utf8'),
  );
  assert.equal(payload.task_id, 'img_task_demo_456');
  assert.equal(payload.status, 'submitted');
  assert.equal(payload.error.message, 'Temporary network error');
  cleanup([runDir]);
});

test('generate-image validates unsupported model', async () => {
  await assert.rejects(
    () =>
      runGenerateImage({
        prompt: 'test',
        runId: 'smoke-image-invalid-model',
        skillDir: IMAGE_SKILL_DIR,
        model: 'gpt-image-1',
        resolution: '2K',
        client: new FakeImageClient(),
      }),
    /Unsupported model/,
  );
});

test('generate-image validates resolution incompatible with seedream', async () => {
  await assert.rejects(
    () =>
      runGenerateImage({
        prompt: 'test',
        runId: 'smoke-image-invalid-res',
        skillDir: IMAGE_SKILL_DIR,
        model: 'seedream-5.0-lite',
        resolution: '1K',
        client: new FakeImageClient(),
      }),
    /does not support resolution 1K/,
  );
});

test('generate-image can query existing task id', async () => {
  const runDir = path.join(IMAGE_SKILL_DIR, '.artifacts', 'smoke-image-status');
  cleanup([runDir]);

  const result = await runGenerateImageStatus({
    taskId: 'img_task_demo_456',
    runId: 'smoke-image-status',
    skillDir: IMAGE_SKILL_DIR,
    client: new FakeImageClient(),
  });

  assert.equal(result.status, 'succeeded');
  assert.equal(result.images.length, 2);
  assert.equal(fs.existsSync(path.join(result.artifactsDir, 'outputs', 'result.json')), true);
  cleanup([runDir]);
});
