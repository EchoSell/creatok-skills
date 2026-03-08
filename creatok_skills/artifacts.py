from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict


@dataclass(frozen=True)
class Artifacts:
    root: Path

    def ensure(self) -> None:
        (self.root / "input").mkdir(parents=True, exist_ok=True)
        (self.root / "transcript").mkdir(parents=True, exist_ok=True)
        (self.root / "vision").mkdir(parents=True, exist_ok=True)
        (self.root / "outputs").mkdir(parents=True, exist_ok=True)
        (self.root / "logs").mkdir(parents=True, exist_ok=True)

    def write_json(self, rel: str, obj: Dict[str, Any]) -> Path:
        p = self.root / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(obj, ensure_ascii=False, indent=2), "utf-8")
        return p

    def write_text(self, rel: str, text: str) -> Path:
        p = self.root / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text, "utf-8")
        return p


def artifacts_root_for_skill(skill_dir: Path) -> Path:
    return skill_dir / ".artifacts"


def artifacts_for_run(skill_dir: Path, run_id: str) -> Artifacts:
    return Artifacts(root=artifacts_root_for_skill(skill_dir) / run_id)
