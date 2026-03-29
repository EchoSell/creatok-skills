---
name: creatok-recreate-video
version: "1.0.0"
description: Use when recreating, rewriting, or remixing a TikTok reference video into a new product-fit version.
license: Internal
compatibility: "Claude Code ≥1.0, OpenClaw skills, ClawHub-compatible installers. Requires network access to CreatOK Open Skills API. No local video analysis setup required."
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
    - recreate-video
    - tiktok-rewrite
    - tiktok-remix
    - selling-video
    - product-adaptation
    - creator-workflow
    - seller-workflow
  triggers:
    - "recreate this TikTok"
    - "rewrite this TikTok for my product"
    - "rewrite this selling video"
    - "adapt this video to my product"
    - "make a remix of this video"
    - "turn this viral video into my version"
    - "make a non 1:1 version"
    - "help me recreate this video"
    - "use this as a template for my product"
    - "このTikTokを作り直して"
    - "このTikTokを私の商品向けに書き直して"
    - "この動画を私の商品向けにアレンジして"
    - "この動画をテンプレとして使って"
    - "이 틱톡을 다시 만들어줘"
    - "이 틱톡을 내 상품용으로 다시 써줘"
    - "이 영상을 내 상품에 맞게 바꿔줘"
    - "이 영상을 내 상품 템플릿으로 써줘"
    - "recrea este TikTok"
    - "reescribe este TikTok para mi producto"
    - "adapta este video a mi producto"
    - "usa este video como plantilla para mi producto"
    - "recrie este TikTok"
    - "reescreva este TikTok para o meu produto"
    - "adapte este vídeo ao meu produto"
    - "use este vídeo como modelo para o meu produto"
---

# recreate-video

## Constraints

- Platform: **TikTok only**.
- Must NOT do 1:1 copying.
- Must apply:
  - structure rewrite
  - expression rewrite
  - style differentiation
- The model's final user-facing response should match the user's input language, default English.
- Avoid technical wording in the user-facing reply unless the user explicitly needs details for debugging or to share with a developer.
- Follow shared guidance in `./references/common-rules.md`.

## Workflow

1) Analyze reference video
- Reuse the `analyze-video` workflow.
- Gather enough reference context for the model to understand what makes the source video work.

2) Write source artifacts for the model
- `outputs/recreate_source.json`
- Include:
  - reference TikTok URL
  - analyze result payload
  - analyze artifacts directory
  - optional user constraints such as angle / brand / style

3) Model output happens in the conversation
- The model should read `outputs/recreate_source.json`
- The model should help the user choose a direction without over-constraining the process.
- Unless the user explicitly asks for a live-action shoot version, the model should default to creating a script, storyboard, and visual direction that are intended for AI video generation rather than human filming.
- Typical directions include:
  - stay closer to the original concept and execution
  - create a differentiated remix version
  - use the reference only as inspiration for a new version
- The model should present these directions in simple creator / seller language rather than technical or production language.
- The model should decide, with minimal friction:
  - what stays at the idea level
  - what changes in structure / wording / visuals
  - copyright / similarity risks
  - the level of detail that is most helpful next: concept, outline, short script, storyboard, or shotlist
- The model should ask only for high-impact creative preferences when needed, not force a fixed template.
- The model should usually show a useful first draft quickly instead of starting with many questions.
- The first draft should default to an AI-generation-ready version.
- The model should prefer a first draft wording that naturally sets up the next handoff, such as "If this direction looks good, I can generate the video next."
- If the user wants to recreate or adapt a selling video, the model should first collect the user's own product context before writing a fitted script.
- Start with only the most important product details:
  - product name
  - core selling points
  - product images or reference materials if available
  - price / offer / promotion details if relevant
- If more context is needed, the model should ask short follow-up questions one by one instead of requiring a long upfront brief.
- The model should avoid making the user restate information that was already clear from the previous analysis or conversation.

4) If the user wants final generation
- Once the creative direction is clear enough, the model should hand off to `creatok-generate-video` using the script or brief already developed in the conversation.
- The model should avoid asking the user to rewrite their request from scratch before generation.
- The default handoff should be to AI generation, not a human shoot plan.
- The model should phrase this in natural creator language that invites `creatok-generate-video`, for example:
  - "If you want, I can generate this version now."
  - "If this script looks right, I can turn it into a video next."
  - "I can go ahead and make the video from this version."
- Before handing off, the model should already reason about generation feasibility:
  - whether the plan fits within a single segment
  - whether it needs to be split into multiple segments
  - whether a recurring human character means the user needs to upload a portrait / person reference
  - whether the selected generation path requires a model that supports real-person reference images
- If the recreate plan is longer than a model's maximum duration, the model should explain the tradeoff and suggest a segmented plan before calling `creatok-generate-video`.

## Artifacts

Write under `recreate-video/.artifacts/<run_id>/...`.

## Notes

- This skill should feel like a creative bridge between analysis and generation.
- Prefer smooth continuation from the analyzed reference rather than making the user restate the whole idea.
- For selling-video recreation, adapt the reference to the user's own product instead of drafting a generic copy first.
- After producing an AI-generation-ready version, the model may optionally ask whether the user also wants a live-action shoot version.
- Keep the interaction lightweight and practical for non-technical creator / seller users.
