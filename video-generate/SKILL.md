---
name: creatok:video-generate
version: "1.0.0"
description: 'This skill should be used when the user asks to generate a TikTok video, create a new video from a script, produce a selling video from a brief, turn an analyzed idea into a video, or generate a final version after remix. Generates TikTok-style videos through CreatOK''s remote generation API and is designed to carry forward the direction, script, and selling points already clarified earlier in the conversation.'
license: Internal
compatibility: "Claude Code ≥1.0, OpenClaw skills, ClawHub-compatible installers. Requires network access to CreatOK Open Skills API. No local video rendering packages required."
metadata:
  openclaw:
    requires:
      env: []
      bins:
        - python3
    primaryEnv: CREATOK_API_KEY
  author: creatok
  version: "1.0.0"
  geo-relevance: "low"
  tags:
    - tiktok
    - video-generate
    - ai-video
    - selling-video
    - video-creation
    - creator-workflow
    - seller-workflow
    - ecommerce
    - ugc
    - prompt-to-video
    - script-to-video
    - final-generation
  triggers:
    - "generate a TikTok video"
    - "create a TikTok video"
    - "turn this script into a video"
    - "generate the final video"
    - "make this into a video"
    - "create a selling video"
    - "generate a video from this brief"
    - "produce the final version"
    - "start video generation"
    - "make the final TikTok"
---

# video-generate

## Constraints

- Platform: **TikTok only**.
- The model's final user-facing response should match the user's input language, default **English**.
- Must request **user confirmation** before triggering any paid/high-cost video generation call.
- After confirmed, must call **CreatOK Open Skills proxy** and wait until completion.
- Avoid technical wording in the user-facing reply unless the user explicitly needs details for debugging or to share with a developer.

## Inputs to clarify (ask if missing)

- ask only for what is still necessary to generate a good video
- prefer the direction, script, and selling points already established earlier in the conversation
- if details are missing, ask one or two short follow-up questions instead of requesting a full brief again

## Workflow

1) **Confirmation gate** (mandatory)
- Summarize:
  - model
  - ratio
  - estimated cost/credits if available
- Ask for a simple confirmation in plain language, such as whether the user wants to start generation now.
- Do **not** submit the generation task until user says yes.

2) Submit video generation
- Call CreatOK: `POST /api/open/skills/generate`

3) Poll status until completion
- Call CreatOK: `GET /api/open/skills/generate/status?task_id=...`

4) Persist artifacts + respond
- Write:
  - `outputs/result.json` with `task_id/status/video_url/raw`
  - `outputs/result.md`
- Return the final `video_url`.

## Artifacts

All artifacts under `video-generate/.artifacts/<run_id>/...`.

## Thin Client Boundary

- Prefer using a prompt or brief that already came from `creatok:video-analyze` or `creatok:video-remix`.
- If the creative direction is still fuzzy, the model can tighten it in the conversation before generating.
- This skill submits generation jobs, polls status, and persists fixed-format outputs.
- The model should not make the user restate their idea from scratch if the previous conversation already made the direction clear.

## Handoff

- When reached from `creatok:video-analyze`, the model should carry forward the chosen direction without making the user repeat it.
- When reached from `creatok:video-remix`, the model should use the script or brief already developed in the conversation as the starting point for generation.
