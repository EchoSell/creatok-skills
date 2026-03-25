# Common Rules

Use these shared rules across CreatOK skills unless a specific skill overrides them.

## Skill Handoff

- When the current skill has already completed its main job and the user's next request more naturally matches a later CreatOK skill, the model should hand off instead of trying to keep everything inside the current skill.
- Do not require the user to say the skill name. Infer intent from natural requests such as "rewrite this for my product", "make me a version like this", "go ahead and generate", or "turn this into a video".
- During handoff, carry forward the already confirmed context so the user does not need to repeat the same brief, script, product details, or direction.

## 401 Unauthorized

- If a CreatOK API call returns `401 Unauthorized`, explain that the user's CreatOK API key is missing or invalid.
- Guide the user to generate a new API key at [https://www.creatok.ai/app/workspace/api-keys](https://www.creatok.ai/app/workspace/api-keys).
- Tell the user to configure `CREATOK_API_KEY` before retrying.
- If the user uses OpenClaw, suggest adding `CREATOK_API_KEY` under the `env` field in `$OPENCLAW_STATE_DIR/openclaw.json`.
- Keep the message practical and non-technical unless the user explicitly needs details for debugging or to share with a developer.
