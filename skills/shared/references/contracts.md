# Agent Skills Contracts (shared)

This folder defines *minimal* shared contracts for the main business skills:
- creatok:analyze-video
- creatok:generate-video
- creatok:recreate-video
- creatok:check-task

Keep this small. The goal is portability.

## Terminology

- **Run**: one end-to-end user request execution.
- **Artifacts**: files produced during a run (transcript, vision result, raw JSON outputs, final video URL).

## Artifact layout

Write all outputs under:

`<skill>/.artifacts/<run_id>/...`

Recommended structure:

```
<run_id>/
  input/                # copied/derived inputs (optional)
  transcript/           # transcript json/txt
  vision/               # normalized vision result
  outputs/              # final json/markdown outputs
  logs/                 # tool logs
```

## JSON output conventions

All skills SHOULD output a single machine-readable JSON file:

- `outputs/result.json`

Common fields:

```json
{
  "run_id": "...",
  "skill": "creatok:analyze-video|creatok:generate-video|creatok:recreate-video|creatok:check-task",
  "language": "en",
  "platform": "tiktok",
  "artifacts": [
    {"type": "file", "name": "transcript", "path": "..."},
    {"type": "file", "name": "vision", "path": "..."},
    {"type": "url", "name": "final_video", "url": "..."}
  ]
}
```
