const { artifactsForRun } = require('./artifacts');
const { defaultClient } = require('./creatok-client');

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pickFirstDefined(source, keys) {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) {
      return source[key];
    }
  }
  return null;
}

function pickVideoStats(video) {
  const statsSource = video && typeof video.stats === 'object' && video.stats ? video.stats : null;
  const getValue = (keys) => {
    if (statsSource) {
      const nested = pickFirstDefined(statsSource, keys);
      if (nested !== null) return nested;
    }
    return pickFirstDefined(video, keys);
  };

  const stats = {
    duration_sec: toNumber(getValue(['duration_sec', 'duration', 'durationSeconds'])),
    views: toNumber(getValue(['view_count', 'views', 'play_count', 'plays', 'playCount'])),
    likes: toNumber(getValue(['like_count', 'likes', 'heart_count', 'hearts'])),
    comments: toNumber(getValue(['comment_count', 'comments', 'reply_count'])),
    shares: toNumber(getValue(['share_count', 'shares', 'repost_count'])),
    saves: toNumber(getValue(['save_count', 'saves', 'favorite_count', 'favorites', 'bookmark_count'])),
  };

  return stats;
}

async function runAnalyzeVideo({ tiktokUrl, runId, skillDir, client = defaultClient() }) {
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
  const videoStats = pickVideoStats(video);

  artifacts.writeJson('input/video_details.json', {
    tiktok_url: tiktokUrl,
    download_url: video.download_url || null,
    cover_url: video.cover_url || null,
    duration: videoStats.duration_sec,
    expires_in_sec: video.expires_in_sec || null,
    video_uid: videoUid,
    stats: videoStats,
  });
  artifacts.writeJson('transcript/transcript.json', { segments });
  artifacts.writeText(
    'transcript/transcript.txt',
    segments.map((segment) => String(segment.content || segment.text || '').trim()).join('\n'),
  );
  artifacts.writeJson('vision/vision.json', { scenes });

  const result = {
    run_id: runId,
    skill: 'creatok-analyze-video',
    platform: 'tiktok',
    session,
    video_uid: videoUid,
    video: {
      tiktok_url: tiktokUrl,
      duration: videoStats.duration_sec,
      download_url: video.download_url || null,
      cover_url: video.cover_url || null,
      stats: videoStats,
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
  runAnalyzeVideo,
};
