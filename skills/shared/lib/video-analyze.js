const { artifactsForRun } = require('./artifacts');
const { defaultClient } = require('./creatok-client');

async function runVideoAnalyze({ tiktokUrl, runId, skillDir, client = defaultClient() }) {
  const artifacts = artifactsForRun(skillDir, runId);
  artifacts.ensure();

  const data = await client.analyze(tiktokUrl);
  const video = data.video || {};
  const transcript = data.transcript || {};
  const vision = data.vision || {};
  const response = data.response || {};
  const session = data.session || {};
  const videoUid = data.video_uid || null;

  const segments = Array.isArray(transcript.segments) ? transcript.segments : [];
  const scenes = Array.isArray(vision.scenes) ? vision.scenes : [];

  artifacts.writeJson('input/video_details.json', {
    tiktok_url: tiktokUrl,
    download_url: video.download_url || null,
    cover_url: video.cover_url || null,
    duration: video.duration_sec || null,
    expires_in_sec: video.expires_in_sec || null,
    video_uid: videoUid,
  });
  artifacts.writeJson('transcript/transcript.json', { segments });
  artifacts.writeText(
    'transcript/transcript.txt',
    segments.map((segment) => String(segment.content || segment.text || '').trim()).join('\n'),
  );
  artifacts.writeJson('vision/vision.json', { scenes });

  const result = {
    run_id: runId,
    skill: 'creatok:video-analyze',
    platform: 'tiktok',
    session,
    video_uid: videoUid,
    video: {
      tiktok_url: tiktokUrl,
      duration: video.duration_sec || null,
      download_url: video.download_url || null,
      cover_url: video.cover_url || null,
    },
    transcript: {
      segments,
      segments_count: segments.length,
      files: {
        json: 'transcript/transcript.json',
        txt: 'transcript/transcript.txt',
      },
    },
    vision: {
      scenes,
      files: {
        json: 'vision/vision.json',
      },
    },
    response: {
      content: response.content || null,
      reasoning_content: response.reasoning_content || null,
      suggestions: response.suggestions || [],
    },
  };

  artifacts.writeJson('outputs/result.json', result);

  return {
    runId,
    artifactsDir: artifacts.root,
    result,
  };
}

module.exports = {
  runVideoAnalyze,
};
