from __future__ import annotations

import json
import subprocess
from dataclasses import dataclass
from typing import Any, Dict, Optional

from .config import CreatokConfig, get_creatok_config


@dataclass(frozen=True)
class CreatokOpenSkillsClient:
    cfg: CreatokConfig

    def _curl_json(
        self,
        method: str,
        url: str,
        body: Optional[Dict[str, Any]] = None,
        timeout_sec: float = 60.0,
    ) -> Dict[str, Any]:
        cmd: List[str] = [
            "curl",
            "-sS",
            "-X",
            method.upper(),
            "--max-time",
            str(int(max(1, timeout_sec))),
            "-H",
            f"Authorization: Bearer {self.cfg.open_skills_key}",
            "-H",
            "Accept: application/json",
        ]

        if body is not None:
            cmd += ["-H", "Content-Type: application/json", "--data", json.dumps(body)]

        cmd.append(url)

        # capture HTTP code to provide better diagnostics when server returns HTML
        cmd += ["-w", "\n__HTTP_CODE__%{http_code}\n"]

        p = subprocess.run(cmd, capture_output=True, text=True)
        if p.returncode != 0:
            raise RuntimeError(f"curl failed ({p.returncode}): {p.stderr.strip()}")

        stdout = p.stdout
        http_code = None
        marker = "\n__HTTP_CODE__"
        if marker in stdout:
            body, tail = stdout.split(marker, 1)
            stdout = body
            try:
                http_code = int(tail.strip())
            except Exception:
                http_code = None

        if http_code and http_code >= 400:
            raise RuntimeError(f"HTTP {http_code} calling {url}. Body: {stdout[:500]}")

        try:
            return json.loads(stdout)
        except Exception as e:
            raise RuntimeError(f"Invalid JSON response: {e}\nBody: {stdout[:500]}")

    def analyze(self, tiktok_url: str, timeout_sec: float = 180.0) -> Dict[str, Any]:
        url = f"{self.cfg.base_url}/api/open/skills/analyze"
        payload = self._curl_json("POST", url, body={"tiktok_url": tiktok_url}, timeout_sec=timeout_sec)
        if payload.get("code") != 0:
            raise RuntimeError(f"CreatOK analyze failed: {payload}")
        return payload.get("data") or {}

    def generate(self, prompt: str, ratio: str, model: str) -> Dict[str, Any]:
        url = f"{self.cfg.base_url}/api/open/skills/generate"
        payload = self._curl_json(
            "POST",
            url,
            body={"prompt": prompt, "ratio": ratio, "model": model},
            timeout_sec=60,
        )
        if payload.get("code") != 0:
            raise RuntimeError(f"CreatOK generate failed: {payload}")
        return payload.get("data") or {}

    def generate_status(self, task_id: str) -> Dict[str, Any]:
        url = f"{self.cfg.base_url}/api/open/skills/generate/status?task_id={task_id}"
        payload = self._curl_json("GET", url, body=None, timeout_sec=60)
        if payload.get("code") != 0:
            raise RuntimeError(f"CreatOK generate status failed: {payload}")
        return payload.get("data") or {}


def default_client() -> CreatokOpenSkillsClient:
    return CreatokOpenSkillsClient(cfg=get_creatok_config())
