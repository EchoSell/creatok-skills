# Platform plugins

These are snapshots built from the latest source `main` commit available on 2026-11-19: [`85fdaf384aea9f45b865ea5ca374de5acf6c50c2`](https://github.com/EchoSell/creatok-connector-packages/commit/85fdaf384aea9f45b865ea5ca374de5acf6c50c2). They are builds of that commit; platform publication status may differ.

- `plugins/codex/plugin/plugin.zip`: complete Codex plugin.
- `plugins/doubao/plugin/plugin.zip`: complete Doubao plugin.
- `plugins/workbuddy/plugin/plugin.zip`: WorkBuddy release connector; `plugins/workbuddy/plugin/skills/` contains its eight separately imported Skill packages.

Verify files with `shasum -a 256 -c PLUGIN-SHA256SUMS` from this directory. For every platform release, rebuild and validate the affected artifacts from its exact release commit, replace that platform's files, and update this provenance and the checksums. If platforms have different source commits, record each separately. The connector-packages repository remains the source of truth.
