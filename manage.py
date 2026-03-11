#!/usr/bin/env python3
"""Manage local CreatOK skills for OpenClaw / Claude / Codex.

Supports:
- package: build .skill artifacts (zip) for distribution
- install: install skills into ~/.agents/skills, ~/.claude/skills, and ~/.codex/skills
- update: package + install
- sync-config: sync creatok-skills/config.local.json from a .env file (e.g. creatok/.env.dev)

Why this exists:
- Fast iteration loop: edit skill in repo -> run `./manage.py update`
- Distribution: commit sources in repo, ship .skill files when needed

Notes:
- Local runtime config lives in: config.local.json (gitignored).
- sync-config writes config.local.json from a .env file; do NOT commit secrets.

Usage:
  cd ~/Projects/creatok-skills
  python3 manage.py package
  python3 manage.py install
  python3 manage.py update
  python3 manage.py sync-config --from ../creatok/.env.local

"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import List, Dict, Optional

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
    "creatok:analyze-video",
    "creatok:generate-video",
    "creatok:recreate-video",
]
SUPPORT_DIRS: List[str] = [
    "shared",
]
COPY_IGNORE = shutil.ignore_patterns(".DS_Store", "__pycache__", "*.pyc", ".artifacts")


def _check_repo_root() -> None:
    if not (PUBLISH_ROOT / "creatok:analyze-video" / "SKILL.md").exists():
        raise SystemExit(
            "Missing skills/ publish directory. Expected skills/creatok:analyze-video/SKILL.md."
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


def _copy_install_payload(target_root: Path, include_runtime_config: bool) -> None:
    target_root.mkdir(parents=True, exist_ok=True)

    for name in SUPPORT_DIRS:
        src = PUBLISH_ROOT / name
        dst = target_root / name

        if dst.exists():
            shutil.rmtree(dst)
        shutil.copytree(src, dst, ignore=COPY_IGNORE)

    for skill_name in SKILL_DIRS:
        src = PUBLISH_ROOT / skill_name
        dst = target_root / skill_name

        if dst.exists():
            shutil.rmtree(dst)
        shutil.copytree(src, dst, ignore=COPY_IGNORE)

    if include_runtime_config:
        # Also copy runtime config if present (local-only, gitignored)
        cfg_src = REPO_ROOT / "config.local.json"
        if cfg_src.exists():
            cfg_dst = target_root / "config.local.json"
            shutil.copyfile(cfg_src, cfg_dst)
            try:
                os.chmod(cfg_dst, 0o600)
            except Exception:
                pass


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
        _copy_install_payload(target_root, include_runtime_config=True)

    installed = ", ".join(str(p) for p in unique_roots)
    print(f"OK: installed skills into {installed}")
    print("Tip: if OpenClaw doesn't pick them up immediately, restart the gateway.")


def _parse_env_file(path: Path) -> Dict[str, str]:
    """Parse a .env file into a dict.

    Supports lines like:
      KEY=value
      export KEY=value
      KEY="value with spaces"

    Ignores comments and blank lines.
    """

    if not path.exists():
        raise SystemExit(f".env file not found: {path}")

    out: Dict[str, str] = {}
    for raw in path.read_text("utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export ") :].strip()
        if "=" not in line:
            continue

        k, v = line.split("=", 1)
        k = k.strip()
        v = v.strip()

        # strip surrounding quotes
        if (len(v) >= 2) and ((v[0] == v[-1]) and v[0] in ("\"", "'")):
            v = v[1:-1]

        out[k] = v

    return out


def sync_config(env_path: Path) -> None:
    """Sync config.local.json from a .env file.

    For creatok-skills, we only need CreatOK Open Skills settings.
    """

    _check_repo_root()

    env = _parse_env_file(env_path)

    cfg_path = REPO_ROOT / "config.local.json"
    cfg: Dict[str, object] = {}
    if cfg_path.exists():
        try:
            import json

            cfg = json.loads(cfg_path.read_text("utf-8"))
        except Exception:
            cfg = {}

    # CreatOK proxy (required)
    creatok = cfg.get("creatok", {}) if isinstance(cfg.get("creatok"), dict) else {}
    base_url = env.get("CREATOK_BASE_URL") or env.get("NEXT_PUBLIC_BASE_URL") or creatok.get("baseUrl") or "https://www.creatok.ai"
    open_key = env.get("CREATOK_API_KEY") or creatok.get("apiKey") or ""

    cfg["creatok"] = {
        "baseUrl": base_url,
        "apiKey": open_key,
    }

    import json

    cfg_path.write_text(json.dumps(cfg, ensure_ascii=False, indent=2) + "\n", "utf-8")

    try:
        os.chmod(cfg_path, 0o600)
    except Exception:
        pass

    print(f"OK: synced {cfg_path} from {env_path}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "command",
        choices=["package", "install", "update", "sync-config"],
        help="Action to perform",
    )
    ap.add_argument(
        "--from",
        dest="from_path",
        help="Path to .env file (for sync-config), e.g. ../creatok/.env.dev",
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

    if args.command == "sync-config":
        if not args.from_path:
            raise SystemExit("Missing --from <path-to-env>")
        sync_config(Path(args.from_path).expanduser())
        return 0

    return 2


if __name__ == "__main__":
    raise SystemExit(main())
