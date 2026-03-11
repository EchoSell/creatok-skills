---
name: creatok-generate-video
version: "1.0.0"
description: 'This skill should be used when the user asks to generate a TikTok video, create a TikTok ad, create a new video from a script, produce a selling video from a brief, turn an analyzed idea into a video, generate a final version after remix, or check and continue an existing video generation task. Generates TikTok-style videos through CreatOK''s generation API and can also recover interrupted generation flows from an existing task id.'
license: Internal
compatibility: "Claude Code ≥1.0, OpenClaw skills, ClawHub-compatible installers. Requires network access to CreatOK Open Skills API. No local video rendering packages required."
metadata:
  openclaw:
    requires:
      env: []
      bins:
        - node
    primaryEnv: CREATOK_API_KEY
  author: creatok
  version: "1.0.0"
  geo-relevance: "low"
  tags:
    - tiktok
    - generate-video
    - ai-video
    - tiktok-ad
    - tiktok-product-video
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
    - "create a TikTok ad"
    - "turn this script into a video"
    - "make a TikTok selling video"
    - "create a selling video"
    - "create a TikTok product video"
    - "generate a video from this brief"
    - "start video generation"
    - "generate it now"
    - "go ahead and generate"
    - "use this script to generate"
    - "make the video now"
    - "make this into a video"
    - "start this generation"
    - "check this video generation task"
    - "did my video finish"
    - "check this task id"
---

# generate-video

## Constraints

- Platform: **TikTok only**.
- The model's final user-facing response should match the user's input language, default **English**.
- Must request **user confirmation** before triggering any paid/high-cost video generation call.
- After confirmed, must call **CreatOK Open Skills proxy** and wait until completion.
- Avoid technical wording in the user-facing reply unless the user explicitly needs details for debugging or to share with a developer.
- Follow shared guidance in `./references/common-rules.md`.
- Unless the user explicitly asks for a live-action shoot version, the model should assume the goal is to generate an AI video, not to prepare a human filming plan.

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
- prefer details that help AI generation directly, such as scene intent, visual style, pacing, product emphasis, and whether a person reference image is available

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
- Call CreatOK: `POST /api/open/skills/tasks`

3) Poll status until completion
- Call CreatOK: `GET /api/open/skills/tasks/status?task_id=...`

4) Persist artifacts + respond
- Write:
  - `outputs/result.json` with `task_id/status/video_url/raw`
  - `outputs/result.md`
- Persist the `task_id` immediately after submission, before waiting for the final status, so the user can recover the task later if the local process is interrupted.
- Return the final `video_url`.
- After the AI version is complete, the model may optionally ask whether the user also wants a live-action shoot version of the same idea.

## Existing Task Recovery

- If the user already has a `task_id`, this skill should continue from that task instead of starting a new one.
- In recovery mode, do not ask the user to restate the prompt or creative brief if the task id is already available.
- The model can either:
  - check the current task status once
  - or continue waiting and polling if the user wants to keep checking
- If the task succeeded, return the final `video_url`.
- If the task is still queued or running, explain that clearly and offer to keep checking.
- If the task failed, explain the failure message if available and suggest the next best step.

## Artifacts

All artifacts under `generate-video/.artifacts/<run_id>/...`.

## Thin Client Boundary

- Prefer using a prompt or brief that already came from `creatok-analyze-video` or `creatok-recreate-video`.
- If the creative direction is still fuzzy, the model can tighten it in the conversation before generating.
- This skill submits generation jobs, polls status, and persists fixed-format outputs.
- The model should not make the user restate their idea from scratch if the previous conversation already made the direction clear.
- The model should optimize the brief for AI video generation by default, not for on-set filming.
- Natural user confirmations such as "generate it", "make the video", "go ahead", or "use this version" should be treated as intent to use this skill, as long as the cost confirmation step is still satisfied.

## Handoff

- When reached from `creatok-analyze-video`, the model should carry forward the chosen direction without making the user repeat it.
- When reached from `creatok-recreate-video`, the model should use the script or brief already developed in the conversation as the starting point for generation.
- If generation was interrupted after submission, the model should help the user continue inside `creatok-generate-video` with the existing `task_id` instead of restarting the job from scratch.
