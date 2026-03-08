#!/usr/bin/env python3
"""CLI entrypoint for video-remix.

Thin wrapper around `creatok_skills.video_remix.run_video_remix`.

Outputs under: video-remix/.artifacts/<run_id>/
- outputs/remix_source.json
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Allow importing repo-local `creatok_skills` package when running directly.
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from creatok_skills.video_remix import run_video_remix  # noqa: E402

SKILL_ROOT = Path(__file__).resolve().parents[1]
ANALYZE_SKILL_ROOT = SKILL_ROOT.parent / "creatok:video-analyze"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tiktok_url", required=True)
    ap.add_argument("--run_id", required=True)
    ap.add_argument("--angle", required=False)
    ap.add_argument("--brand", required=False)
    ap.add_argument("--style", required=False)
    args = ap.parse_args()

    res = run_video_remix(
        tiktok_url=args.tiktok_url,
        run_id=args.run_id,
        skill_dir=SKILL_ROOT,
        analyze_skill_dir=ANALYZE_SKILL_ROOT,
        angle=args.angle,
        brand=args.brand,
        style=args.style,
    )

    print(
        json.dumps(
            {
                "ok": True,
                "run_id": res.run_id,
                "artifacts_dir": str(res.artifacts_dir),
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
