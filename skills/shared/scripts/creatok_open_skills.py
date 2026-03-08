#!/usr/bin/env python3
"""CreatOK Open Skills API client (repo-independent, curl-based).

This is the thin client used by creatok-skills to call CreatOK's proxy endpoints:
- POST /api/open/skills/transcript
- POST /api/open/skills/vision
- POST /api/open/skills/generate
- GET  /api/open/skills/generate/status

Auth:
- Authorization: Bearer <CREATOK_API_KEY>

Config (priority):
- env: CREATOK_BASE_URL, CREATOK_API_KEY
- config file: creatok-skills/config.local.json (creatok.baseUrl, creatok.apiKey)

Notes:
- Vision endpoint limits: max 8 frames per request and request body <= 4MB.
"""

from __future__ import annotations

import json
import os
import subprocess
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


def load_local_config() -> Dict[str, Any]:
    # Prefer config.local.json located at <skills_root>/config.local.json
    skills_root = Path(__file__).resolve().parents[2]
    p = skills_root / "config.local.json"
    if not p.exists():
        return {}
    return json.loads(p.read_text("utf-8"))


def get_creatok_config() -> Tuple[str, str]:
    cfg = load_local_config().get("creatok", {})
    base_url = os.getenv("CREATOK_BASE_URL") or cfg.get("baseUrl") or "https://www.creatok.ai"
    key = os.getenv("CREATOK_API_KEY") or cfg.get("apiKey")
    if not key:
        raise RuntimeError(
            "Missing CREATOK_API_KEY. Set env CREATOK_API_KEY or fill creatok-skills/config.local.json: creatok.apiKey"
        )
    return base_url.rstrip("/"), str(key)


def _curl_json(method: str, url: str, headers: Dict[str, str], body: Optional[Dict[str, Any]] = None, timeout_sec: float = 60.0) -> Dict[str, Any]:
    cmd: List[str] = [
        "curl",
        "-sS",
        "-X",
        method.upper(),
        "--max-time",
        str(int(max(1, timeout_sec))),
    ]

    for k, v in headers.items():
        cmd += ["-H", f"{k}: {v}"]

    if body is not None:
        cmd += ["-H", "Content-Type: application/json", "--data", json.dumps(body)]

    cmd.append(url)

    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode != 0:
        raise RuntimeError(f"curl failed ({p.returncode}): {p.stderr.strip()}")

    try:
        return json.loads(p.stdout)
    except Exception as e:
        raise RuntimeError(f"Invalid JSON response: {e}\nRaw: {p.stdout[:500]}")


def transcript(tiktok_url: str) -> Dict[str, Any]:
    base_url, key = get_creatok_config()
    url = f"{base_url}/api/open/skills/transcript"
    payload = _curl_json(
        "POST",
        url,
        headers={"Authorization": f"Bearer {key}", "Accept": "application/json"},
        body={"tiktok_url": tiktok_url},
        timeout_sec=60,
    )
    if payload.get("code") != 0:
        raise RuntimeError(f"CreatOK transcript failed: {payload}")
    return payload.get("data") or {}


def vision(frames: List[Dict[str, str]], timeout_sec: float = 120.0) -> Dict[str, Any]:
    base_url, key = get_creatok_config()
    url = f"{base_url}/api/open/skills/vision"
    body: Dict[str, Any] = {"frames": frames}

    payload = _curl_json(
        "POST",
        url,
        headers={"Authorization": f"Bearer {key}", "Accept": "application/json"},
        body=body,
        timeout_sec=timeout_sec,
    )

    # Open skills endpoints use {code,msg,data} for success and custom {code,msg} for errors
    if payload.get("code") != 0:
        raise RuntimeError(f"CreatOK vision failed: {payload}")

    return payload.get("data") or {}


def generate(prompt: str, ratio: str, model: str) -> Dict[str, Any]:
    base_url, key = get_creatok_config()
    url = f"{base_url}/api/open/skills/generate"
    payload = _curl_json(
        "POST",
        url,
        headers={"Authorization": f"Bearer {key}", "Accept": "application/json"},
        body={"prompt": prompt, "ratio": ratio, "model": model},
        timeout_sec=60,
    )
    if payload.get("code") != 0:
        raise RuntimeError(f"CreatOK generate failed: {payload}")
    return payload.get("data") or {}


def generate_status(task_id: str) -> Dict[str, Any]:
    base_url, key = get_creatok_config()
    url = f"{base_url}/api/open/skills/generate/status?task_id={task_id}"
    payload = _curl_json(
        "GET",
        url,
        headers={"Authorization": f"Bearer {key}", "Accept": "application/json"},
        body=None,
        timeout_sec=60,
    )
    if payload.get("code") != 0:
        raise RuntimeError(f"CreatOK generate status failed: {payload}")
    return payload.get("data") or {}


def poll_generate(task_id: str, poll_interval: float = 3.0, timeout_sec: float = 600.0) -> Dict[str, Any]:
    started = time.time()
    last_status: Optional[str] = None

    while True:
        if time.time() - started > timeout_sec:
            raise TimeoutError(f"Timeout waiting for task {task_id}")

        st = generate_status(task_id)
        status = str(st.get("status") or "")
        if status != last_status:
            print(json.dumps({"task_id": task_id, "status": status}))
            last_status = status

        if status == "succeeded":
            return st
        if status == "failed":
            return st

        time.sleep(poll_interval)
