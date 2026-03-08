from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional

from .artifacts import Artifacts
from .creatok_client import CreatokOpenSkillsClient, default_client


@dataclass(frozen=True)
class VideoAnalyzeResult:
    run_id: str
    artifacts_dir: Path
    result: Dict[str, Any]


def run_video_analyze(
    *,
    tiktok_url: str,
    run_id: str,
    skill_dir: Path,
    client: Optional[CreatokOpenSkillsClient] = None,
) -> VideoAnalyzeResult:
    client = client or default_client()

    artifacts = Artifacts(root=(skill_dir / ".artifacts" / run_id))
    artifacts.ensure()

    data = client.analyze(tiktok_url)
    video = data.get("video") or {}
    transcript = data.get("transcript") or {}
    vision_data = data.get("vision") or {}
    response = data.get("response") or {}
    session = data.get("session") or {}
    video_uid = data.get("video_uid")

    segments = transcript.get("segments") or []
    if not isinstance(segments, list):
        segments = []

    scenes = vision_data.get("scenes") or []
    if not isinstance(scenes, list):
        scenes = []

    video_details = {
        "tiktok_url": tiktok_url,
        "download_url": video.get("download_url"),
        "cover_url": video.get("cover_url"),
        "duration": video.get("duration_sec"),
        "expires_in_sec": video.get("expires_in_sec"),
        "video_uid": video_uid,
    }
    artifacts.write_json("input/video_details.json", video_details)
    artifacts.write_json("transcript/transcript.json", {"segments": segments})
    artifacts.write_text(
        "transcript/transcript.txt",
        "\n".join([str(s.get("content") or s.get("text") or "").strip() for s in segments]),
    )
    artifacts.write_json("vision/vision.json", {"scenes": scenes})

    result: Dict[str, Any] = {
        "run_id": run_id,
        "skill": "creatok:video-analyze",
        "platform": "tiktok",
        "session": session,
        "video_uid": video_uid,
        "video": {
            "tiktok_url": tiktok_url,
            "duration": video.get("duration_sec"),
            "download_url": video.get("download_url"),
            "cover_url": video.get("cover_url"),
        },
        "transcript": {
            "segments": segments,
            "segments_count": len(segments),
            "files": {
                "json": "transcript/transcript.json",
                "txt": "transcript/transcript.txt",
            },
        },
        "vision": {
            "scenes": scenes,
            "files": {
                "json": "vision/vision.json",
            },
        },
        "response": {
            "content": response.get("content"),
            "reasoning_content": response.get("reasoning_content"),
            "suggestions": response.get("suggestions") or [],
        },
    }

    artifacts.write_json("outputs/result.json", result)

    return VideoAnalyzeResult(run_id=run_id, artifacts_dir=artifacts.root, result=result)
