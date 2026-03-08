#!/usr/bin/env python3
"""Generate video via the CreatOK Open Skills proxy and poll status.

Config:
- env: CREATOK_BASE_URL, CREATOK_API_KEY
- config: creatok-skills/config.local.json (creatok.baseUrl, creatok.openSkillsKey)
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from shared.scripts.creatok_open_skills import generate, poll_generate


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--prompt", required=True)
    ap.add_argument("--ratio", default="9:16")
    ap.add_argument("--model", default="veo-3.1-fast-exp")
    ap.add_argument("--out", required=False)
    ap.add_argument("--poll_interval", type=float, default=3.0)
    ap.add_argument("--timeout_sec", type=float, default=600.0)
    args = ap.parse_args()

    submit = generate(prompt=args.prompt, ratio=args.ratio, model=args.model)
    task_id = submit.get("task_id")
    if not task_id:
        raise RuntimeError(f"Missing task_id: {submit}")

    print(json.dumps({"task_id": task_id, "status": "submitted"}))

    st = poll_generate(task_id, poll_interval=args.poll_interval, timeout_sec=args.timeout_sec)

    status = st.get("status")
    video_url = None
    if isinstance(st.get("result"), dict):
        video_url = st["result"].get("video_url")

    result = {
        "task_id": task_id,
        "status": status,
        "video_url": video_url,
        "raw": st,
    }

    if args.out:
        outp = Path(args.out)
        outp.parent.mkdir(parents=True, exist_ok=True)
        outp.write_text(json.dumps(result, ensure_ascii=False, indent=2), "utf-8")

    if status != "succeeded" or not video_url:
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
