# Agent Skills Contracts (shared)

This folder defines *minimal* shared contracts for the 3 business skills:
- creatok:video-analyze
- creatok:video-generate
- creatok:video-remix

Keep this small. The goal is portability.

## Terminology

- **Run**: one end-to-end user request execution.
- **Artifacts**: files produced during a run (transcript, frames, raw JSON outputs, final video URL).

## Artifact layout

Write all outputs under:

`creatok-skills/.artifacts/<run_id>/...`

Recommended structure:

```
<run_id>/
  input/                # copied/derived inputs (optional)
  frames/               # extracted frames
  transcript/           # transcript json/txt
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
  "skill": "creatok:video-analyze|creatok:video-generate|creatok:video-remix",
  "language": "en",
  "platform": "tiktok",
  "artifacts": [
    {"type": "file", "name": "transcript", "path": "..."},
    {"type": "file", "name": "frames", "path": "..."},
    {"type": "url", "name": "final_video", "url": "..."}
  ]
}
```
