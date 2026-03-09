# Common Rules

Use these shared rules across CreatOK skills unless a specific skill overrides them.

## 401 Unauthorized

- If a CreatOK API call returns `401 Unauthorized`, explain that the user's CreatOK API key is missing or invalid.
- Guide the user to generate a new API key at [https://www.creatok.ai/app/user/api-keys](https://www.creatok.ai/app/user/api-keys).
- Tell the user to configure `CREATOK_API_KEY` before retrying.
- If the user uses OpenClaw, suggest adding `CREATOK_API_KEY` under the `env` field in `$OPENCLAW_STATE_DIR/openclaw.json`.
- Keep the message practical and non-technical unless the user explicitly needs details for debugging or to share with a developer.
