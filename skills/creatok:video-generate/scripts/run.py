#!/usr/bin/env python3
"""CLI entrypoint for video-generate.

Thin wrapper around `creatok_skills.video_generate.run_video_generate`.

Outputs under: video-generate/.artifacts/<run_id>/
- outputs/result.json
- outputs/result.md
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Allow importing repo-local `creatok_skills` package when running directly.
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from creatok_skills.video_generate import run_video_generate  # noqa: E402

SKILL_ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS_ROOT = SKILL_ROOT / ".artifacts"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--prompt", required=True)
    ap.add_argument("--ratio", default="9:16")
    ap.add_argument("--model", default="veo-3.1-fast-exp")
    ap.add_argument("--run_id", required=True)
    ap.add_argument("--yes", action="store_true")
    ap.add_argument("--timeout_sec", type=float, default=600.0)
    ap.add_argument("--poll_interval", type=float, default=3.0)
    args = ap.parse_args()

    if not args.yes:
        print("About to generate video via CreatOK Open Skills proxy.")
        print(f"- model: {args.model}")
        print(f"- ratio: {args.ratio}")
        print(f"- prompt (first 120 chars): {args.prompt[:120]}")
        ok = input("Confirm to start generation? (yes/no): ").strip().lower()
        if ok not in ("y", "yes"):
            print("Canceled.")
            return 2

    res = run_video_generate(
        prompt=args.prompt,
        ratio=args.ratio,
        model=args.model,
        poll_interval=args.poll_interval,
        timeout_sec=args.timeout_sec,
    )

    run_dir = ARTIFACTS_ROOT / args.run_id
    (run_dir / "outputs").mkdir(parents=True, exist_ok=True)

    out_json = run_dir / "outputs" / "result.json"
    out_json.write_text(
        json.dumps(
            {
                "task_id": res.task_id,
                "status": res.status,
                "model": args.model,
                "video_url": res.video_url,
                "raw": res.raw,
            },
            ensure_ascii=False,
            indent=2,
        ),
        "utf-8",
    )

    out_md = run_dir / "outputs" / "result.md"
    out_md.write_text(
        "".join(
            [
                "# Video Generate Result\n\n",
                f"- run_id: `{args.run_id}`\n",
                f"- model: `{args.model}`\n",
                f"- status: `{res.status}`\n",
                f"- task_id: `{res.task_id}`\n",
                f"- video_url: {res.video_url or '(missing)'}\n",
            ]
        ),
        "utf-8",
    )

    print(json.dumps({"ok": True, "run_id": args.run_id, "video_url": res.video_url}))
    return 0 if (res.status == "succeeded" and res.video_url) else 1


if __name__ == "__main__":
    raise SystemExit(main())
