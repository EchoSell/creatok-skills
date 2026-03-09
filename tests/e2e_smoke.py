#!/usr/bin/env python3
from __future__ import annotations

import json
import shutil
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


REPO_ROOT = Path(__file__).resolve().parents[1]
SKILLS_ROOT = REPO_ROOT / "skills"
sys.path.insert(0, str(SKILLS_ROOT))

from creatok_skills.video_analyze import run_video_analyze
from creatok_skills.video_generate import run_video_generate
from creatok_skills.video_remix import VideoRemixResult, run_video_remix

ANALYZE_SKILL_DIR = SKILLS_ROOT / "creatok:video-analyze"
REMIX_SKILL_DIR = SKILLS_ROOT / "creatok:video-remix"


class FakeClient:
    def analyze(self, tiktok_url: str, timeout_sec: float = 180.0) -> dict:
        return {
            "session": {"id": 101, "uid": "sess_demo_101"},
            "video_uid": "video_demo_123",
            "video": {
                "download_url": "https://example.com/video.mp4",
                "cover_url": "https://example.com/cover.jpg",
                "duration_sec": 12.4,
                "expires_in_sec": 7200,
            },
            "transcript": {
                "segments": [
                    {"sequence": 1, "start": 0.0, "end": 1.8, "content": "Stop scrolling if your skin looks tired."},
                    {"sequence": 2, "start": 1.8, "end": 5.0, "content": "Use one active and one hydrator to rebuild texture."},
                    {"sequence": 3, "start": 5.0, "end": 8.0, "content": "Go slower than you think to avoid irritation."},
                    {"sequence": 4, "start": 8.0, "end": 11.0, "content": "Follow for the exact weekly routine."},
                ]
            },
            "vision": {
                "scenes": [
                    {
                        "sequence": 1,
                        "start": 0.0,
                        "end": 3.0,
                        "title": "Talking head hook",
                        "shot_type": "talking head",
                    }
                ]
            },
            "response": {
                "content": "This video opens with a skincare hook and moves into routine guidance.",
                "reasoning_content": None,
                "suggestions": ["做一个更贴近原视频的复刻版", "换成敏感肌产品做二创"],
            },
        }

    def generate(self, prompt: str, ratio: str, model: str) -> dict:
        return {"task_id": "task_demo_123"}

    def generate_status(self, task_id: str) -> dict:
        return {
            "status": "succeeded",
            "result": {"video_url": "https://example.com/generated.mp4"},
        }

class EndToEndSmokeTests(unittest.TestCase):
    def setUp(self) -> None:
        self.cleanup_runs = [
            ANALYZE_SKILL_DIR / ".artifacts" / "smoke-analyze",
            REMIX_SKILL_DIR / ".artifacts" / "smoke-remix",
        ]
        for path in self.cleanup_runs:
            if path.exists():
                shutil.rmtree(path)

    def tearDown(self) -> None:
        for path in self.cleanup_runs:
            if path.exists():
                shutil.rmtree(path)

    def test_video_analyze_writes_expected_artifacts(self) -> None:
        res = run_video_analyze(
            tiktok_url="https://www.tiktok.com/@demo/video/123",
            run_id="smoke-analyze",
            skill_dir=ANALYZE_SKILL_DIR,
            client=FakeClient(),
        )

        self.assertTrue((res.artifacts_dir / "outputs" / "result.json").exists())
        self.assertTrue((res.artifacts_dir / "transcript" / "transcript.json").exists())
        self.assertTrue((res.artifacts_dir / "vision" / "vision.json").exists())

        result = json.loads((res.artifacts_dir / "outputs" / "result.json").read_text("utf-8"))
        self.assertEqual(result["skill"], "creatok:video-analyze")
        self.assertEqual(result["platform"], "tiktok")
        self.assertGreaterEqual(result["transcript"]["segments_count"], 1)
        self.assertIn("transcript", result)
        self.assertIn("vision", result)
        self.assertIn("response", result)

    def test_video_remix_writes_remix_source_only(self) -> None:
        fake_analyze_result = {
            "video": {"tiktok_url": "https://www.tiktok.com/@demo/video/456"},
            "transcript": {"segments": [{"start": 0.0, "end": 1.0, "text": "Hook line"}]},
        }

        with patch(
            "creatok_skills.video_remix.run_video_analyze",
            return_value=type("AnalyzeResult", (), {"run_id": "smoke-remix--analyze", "artifacts_dir": ANALYZE_SKILL_DIR / ".artifacts" / "smoke-remix--analyze", "result": fake_analyze_result})(),
        ):
            res: VideoRemixResult = run_video_remix(
                tiktok_url="https://www.tiktok.com/@demo/video/456",
                run_id="smoke-remix",
                skill_dir=REMIX_SKILL_DIR,
                analyze_skill_dir=ANALYZE_SKILL_DIR,
            )

        outputs_dir = res.artifacts_dir / "outputs"
        self.assertTrue((outputs_dir / "remix_source.json").exists())

        remix_source = json.loads((outputs_dir / "remix_source.json").read_text("utf-8"))
        self.assertEqual(remix_source["reference"]["tiktok_url"], "https://www.tiktok.com/@demo/video/456")
        self.assertIn("analyze_result", remix_source)

    def test_video_generate_returns_final_url(self) -> None:
        res = run_video_generate(
            prompt="A short TikTok-style demo video",
            ratio="9:16",
            client=FakeClient(),
            poll_interval=0.01,
            timeout_sec=1.0,
        )
        self.assertEqual(res.status, "succeeded")
        self.assertEqual(res.video_url, "https://example.com/generated.mp4")


if __name__ == "__main__":
    unittest.main()
