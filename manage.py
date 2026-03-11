#!/usr/bin/env python3
"""Manage local CreatOK skills for OpenClaw / Claude / Codex.

Supports:
- package: build .skill artifacts (zip) for distribution
- install: install skills into ~/.agents/skills, ~/.claude/skills, and ~/.codex/skills
- update: package + install

Why this exists:
- Fast iteration loop: edit skill in repo -> run `./manage.py update`
- Distribution: commit sources in repo, ship .skill files when needed

Usage:
  cd ~/Projects/creatok-skills
  python3 manage.py package
  python3 manage.py install
  python3 manage.py update

"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path
from typing import List, Optional

REPO_ROOT = Path(__file__).resolve().parent
PUBLISH_ROOT = REPO_ROOT / "skills"
DIST_DIR = REPO_ROOT / "dist"
DEFAULT_INSTALL_DIRS: List[Path] = [
    Path("~/.agents/skills").expanduser(),
    Path("~/.claude/skills").expanduser(),
    Path("~/.codex/skills").expanduser(),
]

OPENCLAW_PACKAGE_SKILL = Path(
    "/opt/homebrew/lib/node_modules/openclaw/skills/skill-creator/scripts/package_skill.py"
)

SKILL_DIRS: List[str] = [
    "creatok-analyze-video",
    "creatok-generate-video",
    "creatok-recreate-video",
]
COPY_IGNORE = shutil.ignore_patterns(".DS_Store", "__pycache__", "*.pyc", ".artifacts")


def _check_repo_root() -> None:
    if not (PUBLISH_ROOT / "creatok-analyze-video" / "SKILL.md").exists():
        raise SystemExit(
            "Missing skills/ publish directory. Expected skills/creatok-analyze-video/SKILL.md."
        )


def _run(cmd: List[str]) -> None:
    p = subprocess.run(cmd, text=True)
    if p.returncode != 0:
        raise SystemExit(p.returncode)


def package_all() -> None:
    _check_repo_root()
    if not OPENCLAW_PACKAGE_SKILL.exists():
        raise SystemExit(f"Missing packager: {OPENCLAW_PACKAGE_SKILL}")

    DIST_DIR.mkdir(parents=True, exist_ok=True)

    for name in SKILL_DIRS:
        src = PUBLISH_ROOT / name
        if not src.exists():
            raise SystemExit(f"Missing skill dir: {src}")
        # package_skill.py <skill-folder> [outdir]
        _run(["python3", str(OPENCLAW_PACKAGE_SKILL), str(src), str(DIST_DIR)])

    print(f"OK: packaged skills into {DIST_DIR}")


def _copy_install_payload(target_root: Path) -> None:
    target_root.mkdir(parents=True, exist_ok=True)

    current_skill_names = set(SKILL_DIRS)
    for entry in target_root.iterdir():
        if not entry.is_dir():
            continue
        if not entry.name.startswith("creatok-"):
            continue
        if entry.name in current_skill_names:
            continue
        shutil.rmtree(entry)

    for skill_name in SKILL_DIRS:
        src = PUBLISH_ROOT / skill_name
        dst = target_root / skill_name

        if dst.exists():
            shutil.rmtree(dst)
        shutil.copytree(src, dst, ignore=COPY_IGNORE)


def install_all() -> None:
    _check_repo_root()

    # De-duplicate while preserving order.
    unique_roots: List[Path] = []
    seen = set()
    for root in DEFAULT_INSTALL_DIRS:
        resolved = str(root)
        if resolved in seen:
            continue
        seen.add(resolved)
        unique_roots.append(root)

    for target_root in unique_roots:
        _copy_install_payload(target_root)

    installed = ", ".join(str(p) for p in unique_roots)
    print(f"OK: installed skills into {installed}")
    print("Tip: if OpenClaw doesn't pick them up immediately, restart the gateway.")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "command",
        choices=["package", "install", "update"],
        help="Action to perform",
    )
    args = ap.parse_args()

    if args.command == "package":
        package_all()
        return 0

    if args.command == "install":
        install_all()
        return 0

    if args.command == "update":
        package_all()
        install_all()
        return 0

    return 2


if __name__ == "__main__":
    raise SystemExit(main())
