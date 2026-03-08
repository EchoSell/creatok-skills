from __future__ import annotations

import json
import random
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Optional

from .video_analyze import run_video_analyze


@dataclass(frozen=True)
class VideoRemixResult:
    run_id: str
    artifacts_dir: Path


def _now_run_id(prefix: str = "video-remix") -> str:
    ts = int(time.time())
    suffix = "".join(random.choice("abcdefghijklmnopqrstuvwxyz0123456789") for _ in range(6))
    return f"{prefix}-{ts}-{suffix}"


def run_video_remix(
    *,
    tiktok_url: str,
    skill_dir: Path,
    analyze_skill_dir: Path,
    run_id: Optional[str] = None,
    angle: Optional[str] = None,
    brand: Optional[str] = None,
    style: Optional[str] = None,
) -> VideoRemixResult:
    run_id = run_id or _now_run_id()
    run_dir = skill_dir / ".artifacts" / run_id
    (run_dir / "input").mkdir(parents=True, exist_ok=True)
    (run_dir / "outputs").mkdir(parents=True, exist_ok=True)

    analyze_run_id = f"{run_id}--analyze"
    analyze_res = run_video_analyze(
        tiktok_url=tiktok_url,
        run_id=analyze_run_id,
        skill_dir=analyze_skill_dir,
    )

    remix_source: Dict[str, object] = {
        "reference": {"tiktok_url": tiktok_url},
        "constraints": {
            "angle": angle,
            "brand": brand,
            "style": style,
        },
        "analyze_run_id": analyze_res.run_id,
        "analyze_artifacts_dir": str(analyze_res.artifacts_dir),
        "analyze_result": analyze_res.result,
    }
    (run_dir / "outputs" / "remix_source.json").write_text(
        json.dumps(remix_source, ensure_ascii=False, indent=2),
        "utf-8",
    )

    return VideoRemixResult(run_id=run_id, artifacts_dir=run_dir)
