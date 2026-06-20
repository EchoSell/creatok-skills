# AGENTS.md

This repository is the **public front** for CreatOK Skills: install instructions
and documentation. It contains no runtime code.

## Where things live

- **Skill content** (`SKILL.md` + `references/`) and the **`creatok` CLI** that
  serves and installs them live in the (private) `EchoSell/creatok-cli`
  repository. The skills are `go:embed`-ed into the CLI binary, so the CLI is the
  single source of truth and the single distribution unit.
- Do **not** add `skills/` back into this repo. Editing skills here would
  reintroduce version drift with the CLI. Change skill content in
  `creatok-cli/skills/` instead.

## What belongs here

- `README.md` — user-facing install and usage docs.
- Public installer scripts, once the public binary channel is live.

Keep this repo thin and documentation-only.
