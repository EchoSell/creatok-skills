# Contributing

## Principles

- Skills should be **thin clients**: call CreatOK `/api/open/skills/*` instead of direct provider integrations.
- Keep scripts deterministic and repo-independent.
- Store all runtime outputs under `.artifacts/<run_id>/`.

## Local development

1. Ensure CreatOK is reachable (default: https://www.creatok.ai)
2. Set:

```bash
export CREATOK_BASE_URL="https://www.creatok.ai"
export CREATOK_API_KEY="ok_..."
```

3. Run a skill script from repo root.

## Code style

- Python: keep stdlib-first; avoid heavy deps.
- Prefer `curl` for provider-facing calls if WAF/TLS fingerprinting is an issue.

## Security

- Never commit secrets.
- `config.local.json` is ignored by git.
