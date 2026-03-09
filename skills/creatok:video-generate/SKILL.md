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
- Follow shared error-handling guidance in `../shared/references/common-rules.md`.

## Model Selection Rules

- `Veo 3.1 Fast`
  - actual model id: `veo-3.1-fast-exp`
  - fastest and lowest-cost option
  - best for product demos, short visual tests, and previews
  - supports real-person reference images
  - max video length: **8 seconds**

- `Veo 3.1 Quality`
  - actual model id: `veo-3.1-exp`
  - medium-cost option
  - best for formal product demos and higher-quality final clips
  - supports real-person reference images
  - max video length: **8 seconds**

The model should recommend a model before generation instead of blindly using a default.
The recommendation should follow these principles:

- prefer `Veo 3.1 Fast` (`veo-3.1-fast-exp`) for previews, quick testing, and lightweight product demo clips
- prefer `Veo 3.1 Quality` (`veo-3.1-exp`) for formal product demos and higher-quality final clips

If a chosen plan conflicts with model limits, the model should explain the limitation, suggest a workable plan, and wait for user confirmation before generating.

## Multi-Segment Rules

- If the requested video is longer than the chosen model's maximum duration, the model should recommend splitting it into multiple segments.
- If multi-segment generation is needed and the script includes a recurring human character, the model should tell the user that they need to upload a portrait / person reference and use a model that supports real-person reference images.
- If the final video must be stitched from multiple generated clips, the model should explain that the user will need to assemble the clips afterward.

## Inputs to clarify (ask if missing)

- ask only for what is still necessary to generate a good video
- prefer the direction, script, and selling points already established earlier in the conversation
- if details are missing, ask one or two short follow-up questions instead of requesting a full brief again

## Workflow

1) **Confirmation gate** (mandatory)
- Summarize:
  - model
  - ratio
  - whether the plan is single-shot or multi-segment
  - any important limitation such as duration cap, portrait requirement, or manual stitching afterward
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
