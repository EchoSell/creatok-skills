#!/usr/bin/env python3
"""CLI entrypoint for video-analyze.

Thin wrapper around `creatok_skills.video_analyze.run_video_analyze`.

Outputs under: video-analyze/.artifacts/<run_id>/
- outputs/result.json
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Allow importing repo-local `creatok_skills` package when running directly.
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from creatok_skills.video_analyze import run_video_analyze  # noqa: E402

SKILL_ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tiktok_url", required=True)
    ap.add_argument("--run_id", required=True)
    args = ap.parse_args()

    res = run_video_analyze(
        tiktok_url=args.tiktok_url,
        run_id=args.run_id,
        skill_dir=SKILL_ROOT,
    )

    print(json.dumps({"ok": True, "run_id": res.run_id, "artifacts_dir": str(res.artifacts_dir)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
