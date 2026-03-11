---
name: creatok:check-task
version: "1.0.0"
description: 'This skill should be used when the user asks to check a TikTok video generation task, look up a previous generation status, continue checking a task after an interruption, or retrieve the final video URL from an existing task id. Checks existing CreatOK tasks through the generation status API and helps users recover from interrupted TikTok video generation flows without starting over.'
license: Internal
compatibility: "Claude Code ≥1.0, OpenClaw skills, ClawHub-compatible installers. Requires network access to CreatOK Open Skills API. No local video rendering packages required."
metadata:
  openclaw:
    requires:
      env:
        - CREATOK_API_KEY
      bins:
        - node
    primaryEnv: CREATOK_API_KEY
  author: creatok
  version: "1.0.0"
  geo-relevance: "low"
  tags:
    - tiktok
    - check-task
    - ai-video
    - tiktok-task
    - video-generation-status
    - generation-recovery
    - creator-workflow
    - seller-workflow
    - task-retry
    - video-url
  triggers:
    - "check this video task"
    - "check my TikTok video task"
    - "check generation status"
    - "check my video generation task"
    - "look up this task id"
    - "continue checking this video"
    - "did my TikTok video finish"
    - "did my video finish"
    - "check this task"
    - "get the video url from this task"
    - "resume checking generation"
---

# check-task

## Constraints

- Platform: **TikTok only**.
- This skill checks an existing task. It does **not** create a new one.
- The model's final user-facing response should match the user's input language, default **English**.
- Avoid technical wording in the user-facing reply unless the user explicitly needs details for debugging or to share with a developer.
- Follow shared guidance in `../shared/references/common-rules.md`.
- Input: an existing `task_id` from a previous task request.
- Artifacts must be written under `check-task/.artifacts/<run_id>/...`.

## Workflow

1) Collect an existing task id
- Ask for the existing `task_id` if the user has not provided it yet.
- If the user has a previous task artifact, read the stored `task_id` from there instead of asking them to restate everything.

2) Check status
- Call CreatOK: `GET /api/open/skills/tasks/status?task_id=...`
- If the user wants to keep waiting, continue polling until the task reaches a terminal state.

3) Persist artifacts + respond
- Write:
  - `outputs/result.json` with `task_id/status/video_url/raw/error`
  - `outputs/result.md`
- If the task succeeded, return the final `video_url`.
- If the task is still queued or running, explain that clearly and offer to keep checking.
- If the task failed, explain the failure message if available and suggest the next best step.

## Thin Client Boundary

- This skill only checks an existing task.
- It should not ask the user to restate the creative brief if a `task_id` is already available.
- When paired with `creatok:generate-video`, it should help the user recover from interrupted generation flows. The naming stays generic so it can cover more task types later.
