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
  constructor() {
    this.uploadedFiles = [];
  }

  async analyze() {
    return {
      session: { id: 101, uid: 'sess_demo_101' },
      video_uid: 'video_demo_123',
      video: {
        download_url: 'https://example.com/video.mp4',
        cover_url: 'https://example.com/cover.jpg',
        duration_sec: 12.4,
        view_count: 12345,
        like_count: 678,
        comment_count: 90,
        share_count: 12,
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

  async submitTask(payload) {
    this.lastSubmitPayload = payload;
    return { task_id: 'task_demo_123' };
  }

  async uploadImageFile(filePath) {
    this.uploadedFiles.push(filePath);
    return `uploads/${path.basename(filePath)}`;
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
  assert.equal(payload.video.stats.duration_sec, 12.4);
  assert.equal(payload.video.stats.views, 12345);
  assert.equal(payload.video.stats.likes, 678);
  assert.equal(payload.video.stats.comments, 90);
  assert.equal(payload.video.stats.shares, 12);
  cleanup([runDir]);
});

test('analyze-video preserves missing video stats as null', async () => {
  const runDir = path.join(ANALYZE_SKILL_DIR, '.artifacts', 'smoke-analyze-null-stats');
  cleanup([runDir]);

  class MissingStatsClient extends FakeClient {
    async analyze() {
      return {
        session: { id: 202, uid: 'sess_demo_202' },
        video_uid: 'video_demo_456',
        video: {
          download_url: 'https://example.com/video.mp4',
          cover_url: 'https://example.com/cover.jpg',
          expires_in_sec: 7200,
        },
        transcript: { segments: [] },
        vision: { scenes: [] },
        response: { content: null, reasoning_content: null, suggestions: [] },
      };
    }
  }

  const result = await runAnalyzeVideo({
    tiktokUrl: 'https://www.tiktok.com/@demo/video/789',
    runId: 'smoke-analyze-null-stats',
    skillDir: ANALYZE_SKILL_DIR,
    client: new MissingStatsClient(),
  });

  const payload = JSON.parse(fs.readFileSync(path.join(result.artifactsDir, 'outputs', 'result.json'), 'utf8'));
  assert.equal(payload.video.stats.duration_sec, null);
  assert.equal(payload.video.stats.views, null);
  assert.equal(payload.video.stats.likes, null);
  assert.equal(payload.video.stats.comments, null);
  assert.equal(payload.video.stats.shares, null);
  assert.equal(payload.video.stats.saves, null);
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
    model: 'veo-3.1-fast-exp',
    orientation: '9:16',
    seconds: 8,
    definition: '720p',
    client: new FakeClient(),
    pollInterval: 0.01,
    timeoutSec: 1,
  });

  assert.equal(result.status, 'succeeded');
  assert.equal(result.videoUrl, 'https://example.com/generated.mp4');
  assert.equal(fs.existsSync(path.join(result.artifactsDir, 'outputs', 'result.json')), true);
  const payload = JSON.parse(fs.readFileSync(path.join(result.artifactsDir, 'outputs', 'result.json'), 'utf8'));
  assert.equal(payload.task_id, 'task_demo_123');
  assert.equal(payload.orientation, '9:16');
  assert.equal(payload.seconds, 8);
  assert.equal(payload.definition, '720p');
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
        model: 'veo-3.1-fast-exp',
        orientation: '9:16',
        seconds: 8,
        definition: '720p',
        client: new FailingStatusClient(),
        pollInterval: 0.01,
        timeoutSec: 1,
      }),
    /Temporary network error/,
  );

  const payload = JSON.parse(fs.readFileSync(path.join(runDir, 'outputs', 'result.json'), 'utf8'));
  assert.equal(payload.task_id, 'task_demo_123');
  assert.equal(payload.status, 'submitted');
  assert.equal(payload.seconds, 8);
  assert.equal(payload.definition, '720p');
  assert.equal(payload.error.message, 'Temporary network error');
  cleanup([runDir]);
});

test('generate-video defaults seconds and definition by model', async () => {
  const runDir = path.join(GENERATE_SKILL_DIR, '.artifacts', 'smoke-generate-defaults');
  cleanup([runDir]);

  const client = new FakeClient();
  await runGenerateVideo({
    prompt: 'A short TikTok-style demo video',
    runId: 'smoke-generate-defaults',
    skillDir: GENERATE_SKILL_DIR,
    model: 'sora-2',
    orientation: '9:16',
    client,
    pollInterval: 0.01,
    timeoutSec: 1,
  });

  assert.deepEqual(client.lastSubmitPayload, {
    prompt: 'A short TikTok-style demo video',
    orientation: '9:16',
    seconds: 12,
    definition: '720p',
    model: 'sora-2',
  });
  cleanup([runDir]);
});

test('generate-video validates unsupported definition', async () => {
  await assert.rejects(
    () =>
      runGenerateVideo({
        prompt: 'test',
        runId: 'smoke-generate-invalid-definition',
        skillDir: GENERATE_SKILL_DIR,
        model: 'veo-3.1-fast-exp',
        definition: '1080p',
        client: new FakeClient(),
      }),
    /does not support definition 1080p/,
  );
});

test('generate-video rejects sora-2-exp', async () => {
  await assert.rejects(
    () =>
      runGenerateVideo({
        prompt: 'test',
        runId: 'smoke-generate-unsupported-model',
        skillDir: GENERATE_SKILL_DIR,
        model: 'sora-2-exp',
        client: new FakeClient(),
      }),
    /Unsupported model: sora-2-exp/,
  );
});

test('generate-video uploads local reference images before submit', async () => {
  const runDir = path.join(GENERATE_SKILL_DIR, '.artifacts', 'smoke-generate-reference-images');
  const imageA = path.join(GENERATE_SKILL_DIR, '.artifacts', 'ref-a.png');
  const imageB = path.join(GENERATE_SKILL_DIR, '.artifacts', 'ref-b.jpg');
  cleanup([runDir, imageA, imageB]);
  fs.writeFileSync(imageA, 'fake');
  fs.writeFileSync(imageB, 'fake');

  const client = new FakeClient();
  await runGenerateVideo({
    prompt: 'A short TikTok-style demo video',
    runId: 'smoke-generate-reference-images',
    skillDir: GENERATE_SKILL_DIR,
    model: 'veo-3.1-fast-exp',
    orientation: '9:16',
    referenceImages: [imageA, imageB],
    client,
    pollInterval: 0.01,
    timeoutSec: 1,
  });

  assert.deepEqual(client.uploadedFiles, [imageA, imageB]);
  assert.deepEqual(client.lastSubmitPayload.referenceImageKeys, [
    'uploads/ref-a.png',
    'uploads/ref-b.jpg',
  ]);
  cleanup([runDir, imageA, imageB]);
});

test('generate-video validates reference image count by model', async () => {
  const imageA = path.join(GENERATE_SKILL_DIR, '.artifacts', 'too-many-ref-a.png');
  const imageB = path.join(GENERATE_SKILL_DIR, '.artifacts', 'too-many-ref-b.jpg');
  cleanup([imageA, imageB]);
  fs.writeFileSync(imageA, 'fake');
  fs.writeFileSync(imageB, 'fake');

  await assert.rejects(
    () =>
      runGenerateVideo({
        prompt: 'test',
        runId: 'smoke-generate-too-many-reference-images',
        skillDir: GENERATE_SKILL_DIR,
        model: 'sora-2',
        orientation: '9:16',
        referenceImages: [imageA, imageB],
        client: new FakeClient(),
      }),
    /supports at most 1 reference image/,
  );

  cleanup([imageA, imageB]);
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
  constructor() {
    this.uploadedFiles = [];
  }

  async submitImageTask(payload) {
    this.lastImageSubmitPayload = payload;
    return { task_id: 'img_task_demo_456' };
  }

  async uploadImageFile(filePath) {
    this.uploadedFiles.push(filePath);
    return `uploads/${path.basename(filePath)}`;
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

test('generate-image uploads local reference images before submit', async () => {
  const runDir = path.join(IMAGE_SKILL_DIR, '.artifacts', 'smoke-image-reference-images');
  const imageA = path.join(IMAGE_SKILL_DIR, '.artifacts', 'img-ref-a.png');
  const imageB = path.join(IMAGE_SKILL_DIR, '.artifacts', 'img-ref-b.jpg');
  cleanup([runDir, imageA, imageB]);
  fs.writeFileSync(imageA, 'fake');
  fs.writeFileSync(imageB, 'fake');

  const client = new FakeImageClient();
  await runGenerateImage({
    prompt: 'A product image',
    runId: 'smoke-image-reference-images',
    skillDir: IMAGE_SKILL_DIR,
    model: 'nano-banana-2',
    resolution: '2K',
    referenceImages: [imageA, imageB],
    client,
    pollInterval: 0.01,
    timeoutSec: 1,
  });

  assert.deepEqual(client.uploadedFiles, [imageA, imageB]);
  assert.deepEqual(client.lastImageSubmitPayload.referenceImages, [
    'uploads/img-ref-a.png',
    'uploads/img-ref-b.jpg',
  ]);
  cleanup([runDir, imageA, imageB]);
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
