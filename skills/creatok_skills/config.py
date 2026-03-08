from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict


@dataclass(frozen=True)
class CreatokConfig:
    base_url: str
    open_skills_key: str


def repo_root() -> Path:
    # This file lives at <repo>/creatok_skills/config.py
    return Path(__file__).resolve().parents[1]


def load_local_config() -> Dict[str, Any]:
    p = repo_root() / "config.local.json"
    if not p.exists():
        return {}
    return json.loads(p.read_text("utf-8"))


def get_creatok_config() -> CreatokConfig:
    cfg = load_local_config().get("creatok", {})
    base_url = os.getenv("CREATOK_BASE_URL") or cfg.get("baseUrl") or "https://www.creatok.ai"
    key = os.getenv("CREATOK_API_KEY") or cfg.get("apiKey")
    if not key:
        raise RuntimeError(
            "Missing CREATOK_API_KEY. Set env CREATOK_API_KEY or fill config.local.json: creatok.apiKey"
        )
    return CreatokConfig(base_url=str(base_url).rstrip("/"), open_skills_key=str(key))
