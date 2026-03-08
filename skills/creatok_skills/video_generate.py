from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any, Dict, Optional

from .creatok_client import CreatokOpenSkillsClient, default_client


@dataclass(frozen=True)
class VideoGenerateResult:
    task_id: str
    status: str
    video_url: Optional[str]
    raw: Dict[str, Any]


def poll_generate(
    client: CreatokOpenSkillsClient,
    task_id: str,
    poll_interval: float = 3.0,
    timeout_sec: float = 600.0,
) -> Dict[str, Any]:
    started = time.time()
    last_status: Optional[str] = None

    while True:
        if time.time() - started > timeout_sec:
            raise TimeoutError(f"Timeout waiting for task {task_id}")

        st = client.generate_status(task_id)
        status = str(st.get("status") or "")
        if status != last_status:
            # lightweight progress output
            print({"task_id": task_id, "status": status})
            last_status = status

        if status in ("succeeded", "failed"):
            return st

        time.sleep(poll_interval)


def run_video_generate(
    prompt: str,
    ratio: str = "9:16",
    model: str = "veo-3.1-fast-exp",
    poll_interval: float = 3.0,
    timeout_sec: float = 600.0,
    client: Optional[CreatokOpenSkillsClient] = None,
) -> VideoGenerateResult:
    client = client or default_client()

    submit = client.generate(prompt=prompt, ratio=ratio, model=model)
    task_id = submit.get("task_id")
    if not task_id:
        raise RuntimeError(f"Missing task_id: {submit}")

    st = poll_generate(client, task_id, poll_interval=poll_interval, timeout_sec=timeout_sec)

    status = str(st.get("status") or "")
    video_url = None
    if isinstance(st.get("result"), dict):
        video_url = st["result"].get("video_url")

    return VideoGenerateResult(task_id=str(task_id), status=status, video_url=video_url, raw=st)
