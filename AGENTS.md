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

The CreatOK Plugins archive under `plugins/codex/plugin/` is an exception to the documentation-only rule. Its source of truth is `EchoSell/creatok-connector-packages`. On each release, sync the validated Codex plugin artifact built from the exact release commit, update `PLUGIN-RELEASES.md` and `PLUGIN-SHA256SUMS`, and verify the published copy. Doubao and WorkBuddy distribute through their official marketplaces; do not archive their packages here. Keep CLI skill content out of this repository.

## CLI release notes

- Treat `CHANGELOG.md` as a public copy of the source changelog in `creatok-cli/internal/update/CHANGELOG.md`; synchronize it for every stable CLI release and do not include preview releases. Record the exact version, release date, and meaningful changes in concise, plain language users can understand. Avoid unnecessary internal technical details; push the synchronized public copy and verify it is accessible before the CLI release.
- Keep the README link to the changelog discoverable for users considering an upgrade.
